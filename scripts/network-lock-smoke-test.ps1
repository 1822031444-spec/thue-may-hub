# Kiểm thử cơ chế khoá mạng khi hết hạn thuê.
# Cần server đang chạy tại cổng 8788. Script ghi đè cấu hình khoá mạng và tạo
# dữ liệu thật, nên chỉ chạy trên database thử nghiệm.

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:8788/api'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Api {
  param([string]$Method, [string]$Path, [object]$Body)
  $params = @{
    Method = $Method
    Uri = "$baseUrl$Path"
    WebSession = $session
    ContentType = 'application/json; charset=utf-8'
  }
  if ($null -ne $Body) {
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 6))
  }
  Invoke-RestMethod @params
}

function Assert-Equal {
  param($Expected, $Actual, [string]$Label)
  if ($Expected -ne $Actual) { throw "$Label : mong đợi $Expected nhưng nhận $Actual" }
}

function Get-Device {
  param([string]$Id)
  (Invoke-Api -Method GET -Path '/devices') | Where-Object { $_.id -eq $Id }
}

Invoke-Api -Method POST -Path '/auth/login' -Body @{
  email = 'admin@thuemay.local'
  password = 'Admin@123'
} | Out-Null

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

# --- Chuẩn bị: khách và máy có IP hợp lệ ------------------------------------

$customer = Invoke-Api -Method POST -Path '/customers' -Body @{
  name = "Khách khoá mạng $stamp"
  phone = '0900000001'
}

$device = Invoke-Api -Method POST -Path '/devices' -Body @{
  name = "PC Lock $stamp"
  type = 'PC'
  ipAddress = '10.77.0.21'
  hourlyRate = 10000
  monthlyRate = 2000000
}

# --- Bật cơ chế với lệnh vô hại luôn thành công -----------------------------

Invoke-Api -Method PUT -Path '/network-lock/settings' -Body @{
  enabled = $true
  autoLock = $true
  lockCommand = 'cmd /c echo LOCK {code} {ip}'
  unlockCommand = 'cmd /c echo UNLOCK {code} {ip}'
  graceMinutes = 0
  timeoutSeconds = 15
} | Out-Null

$overview = Invoke-Api -Method GET -Path '/network-lock'
Assert-Equal $true $overview.settings.enabled 'Cơ chế phải được bật'
Assert-Equal 0 $overview.settings.graceMinutes 'Ân hạn đã lưu'

# --- Xem trước câu lệnh phải thay đúng chỗ trống ----------------------------

$preview = Invoke-Api -Method POST -Path '/network-lock/preview' -Body @{ deviceId = $device.id }
if ($preview.lock.command -notlike '*10.77.0.21*') { throw 'Câu lệnh xem trước phải chứa IP thật' }
if ($preview.lock.command -like '*{ip}*') { throw 'Chỗ trống {ip} chưa được thay' }

# --- Khoá tay rồi mở tay -----------------------------------------------------

Invoke-Api -Method POST -Path "/network-lock/devices/$($device.id)/lock" | Out-Null
Assert-Equal 'LOCKED' (Get-Device $device.id).network_status 'Máy phải ở trạng thái khoá'

Invoke-Api -Method POST -Path "/network-lock/devices/$($device.id)/unlock" | Out-Null
Assert-Equal 'OPEN' (Get-Device $device.id).network_status 'Máy phải mở lại'

# --- Lệnh lỗi thì không được đổi trạng thái ---------------------------------

Invoke-Api -Method PUT -Path '/network-lock/settings' -Body @{
  enabled = $true
  autoLock = $true
  lockCommand = 'cmd /c exit 1'
  unlockCommand = 'cmd /c echo UNLOCK {code}'
  graceMinutes = 0
  timeoutSeconds = 15
} | Out-Null

$failed = $false
try { Invoke-Api -Method POST -Path "/network-lock/devices/$($device.id)/lock" | Out-Null }
catch { $failed = $true }
if (-not $failed) { throw 'Lệnh trả mã lỗi phải báo thất bại' }
Assert-Equal 'OPEN' (Get-Device $device.id).network_status 'Lệnh lỗi thì máy vẫn phải ở trạng thái mở'

# --- Chặn chèn lệnh qua trường IP -------------------------------------------

$evil = Invoke-Api -Method POST -Path '/devices' -Body @{
  name = "PC Evil $stamp"
  type = 'PC'
  ipAddress = '10.0.0.1 & calc.exe'
  hourlyRate = 1000
  monthlyRate = 1000
}

Invoke-Api -Method PUT -Path '/network-lock/settings' -Body @{
  enabled = $true
  autoLock = $true
  lockCommand = 'cmd /c echo LOCK {ip}'
  unlockCommand = 'cmd /c echo UNLOCK {ip}'
  graceMinutes = 0
  timeoutSeconds = 15
} | Out-Null

$blocked = $false
try { Invoke-Api -Method POST -Path "/network-lock/devices/$($evil.id)/lock" | Out-Null }
catch { $blocked = $true }
if (-not $blocked) { throw 'Phải từ chối IP chứa ký tự lạ thay vì ghép thẳng vào lệnh' }
Assert-Equal 'OPEN' (Get-Device $evil.id).network_status 'Máy có IP bẩn không được đổi trạng thái'

$evilPreview = Invoke-Api -Method POST -Path '/network-lock/preview' -Body @{ deviceId = $evil.id }
Assert-Equal $false $evilPreview.lock.ok 'Xem trước cũng phải báo IP không hợp lệ'

# --- Tự động khoá khi đơn quá hạn -------------------------------------------

$startAt = (Get-Date).AddHours(-5).ToUniversalTime().ToString('o')
$endAt = (Get-Date).AddHours(-1).ToUniversalTime().ToString('o')

$rental = Invoke-Api -Method POST -Path '/rentals' -Body @{
  customerId = $customer.id
  deviceId = $device.id
  startAt = $startAt
  endAt = $endAt
  baseAmount = 100000
  status = 'ACTIVE'
}

Invoke-Api -Method PUT -Path '/network-lock/settings' -Body @{
  enabled = $true
  autoLock = $true
  lockCommand = 'cmd /c echo LOCK {code} {ip}'
  unlockCommand = 'cmd /c echo UNLOCK {code} {ip}'
  graceMinutes = 0
  timeoutSeconds = 15
} | Out-Null

$sweep = Invoke-Api -Method POST -Path '/network-lock/sweep'
if ($sweep.locked -lt 1) { throw "Vòng quét phải khoá ít nhất 1 máy, nhận $($sweep.locked)" }
Assert-Equal 'LOCKED' (Get-Device $device.id).network_status 'Đơn quá hạn thì máy phải bị khoá tự động'

# --- Có đơn còn hạn trở lại thì vòng quét tự mở mạng -------------------------
# Đóng đơn cũ rồi mở đơn mới còn hạn, mô phỏng việc khách thuê tiếp sau khi hết hạn.

Invoke-Api -Method PATCH -Path "/rentals/$($rental.id)/status" -Body @{ status = 'COMPLETED' } | Out-Null

Invoke-Api -Method POST -Path '/rentals' -Body @{
  customerId = $customer.id
  deviceId = $device.id
  startAt = (Get-Date).ToUniversalTime().ToString('o')
  endAt = (Get-Date).AddDays(7).ToUniversalTime().ToString('o')
  baseAmount = 100000
  status = 'ACTIVE'
} | Out-Null

$sweep2 = Invoke-Api -Method POST -Path '/network-lock/sweep'
if ($sweep2.unlocked -lt 1) { throw "Vòng quét phải mở lại ít nhất 1 máy, nhận $($sweep2.unlocked)" }

$deviceAfter = Get-Device $device.id
Assert-Equal 'OPEN' $deviceAfter.network_status 'Có đơn còn hạn thì mạng phải được mở lại'

# --- Nhật ký phải ghi cả lần thành công lẫn lần lỗi --------------------------

$final = Invoke-Api -Method GET -Path '/network-lock'
$events = @($final.events | Where-Object { $null -ne $_ })
if ($events.Count -lt 3) { throw "Nhật ký phải có ít nhất 3 dòng, nhận $($events.Count)" }
if (-not ($events | Where-Object { $_.status -eq 'FAILED' })) { throw 'Nhật ký phải ghi lại lần chạy thất bại' }
if (-not ($events | Where-Object { $_.source -eq 'AUTO' })) { throw 'Nhật ký phải ghi lại lần khoá tự động' }

# --- Tắt cơ chế thì không chạy lệnh nào -------------------------------------

Invoke-Api -Method PUT -Path '/network-lock/settings' -Body @{
  enabled = $false
  autoLock = $true
  lockCommand = 'cmd /c echo LOCK {code}'
  unlockCommand = 'cmd /c echo UNLOCK {code}'
  graceMinutes = 0
  timeoutSeconds = 15
} | Out-Null

$offBlocked = $false
try { Invoke-Api -Method POST -Path "/network-lock/devices/$($device.id)/unlock" | Out-Null }
catch { $offBlocked = $true }
if (-not $offBlocked) { throw 'Tắt cơ chế thì phải từ chối chạy lệnh' }

[pscustomobject]@{
  Result         = 'PASS'
  Device         = $device.code
  LockedBySweep  = $sweep.locked
  UnlockedBySweep = $sweep2.unlocked
  NetworkStatus  = $deviceAfter.network_status
  Events         = $events.Count
  InjectionBlocked = $true
}
