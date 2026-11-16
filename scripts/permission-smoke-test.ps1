# Kiểm thử tài khoản nhân viên và phân quyền.
# Cần server đang chạy tại cổng 8788. Script tạo tài khoản thật nên chỉ chạy
# trên database thử nghiệm.

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:8788/api'
$owner = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$staff = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Api {
  param([string]$Method, [string]$Path, [object]$Body, $Session)
  $params = @{
    Method = $Method
    Uri = "$baseUrl$Path"
    WebSession = $Session
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

# Goi mot API va tra ve ma trang thai, khong nem loi.
function Get-Status {
  param([string]$Method, [string]$Path, [object]$Body, $Session)
  try {
    Invoke-Api -Method $Method -Path $Path -Body $Body -Session $Session | Out-Null
    return 200
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    throw
  }
}

function Assert-Forbidden {
  param([string]$Method, [string]$Path, [object]$Body, [string]$Label)
  $code = Get-Status -Method $Method -Path $Path -Body $Body -Session $staff
  if ($code -ne 403) { throw "$Label : nhan vien phai bi chan 403 nhung nhan $code" }
}

function Assert-Allowed {
  param([string]$Method, [string]$Path, [object]$Body, [string]$Label)
  $code = Get-Status -Method $Method -Path $Path -Body $Body -Session $staff
  if ($code -ne 200) { throw "$Label : nhan vien phai lam duoc nhung nhan $code" }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$staffEmail = "nhanvien$stamp@thuemay.local"
$staffPass = 'NhanVien@2026'

Invoke-Api -Method POST -Path '/auth/login' -Body @{
  email = 'admin@thuemay.local'; password = 'Admin@123'
} -Session $owner | Out-Null

# --- Chu tao tai khoan nhan vien --------------------------------------------

$created = Invoke-Api -Method POST -Path '/admins' -Body @{
  name = "Nhan vien $stamp"
  email = $staffEmail
  password = $staffPass
  role = 'STAFF'
} -Session $owner

$me = Invoke-Api -Method POST -Path '/auth/login' -Body @{
  email = $staffEmail; password = $staffPass
} -Session $staff
Assert-Equal 'STAFF' $me.role 'Vai tro tai khoan vua tao'

# --- Mat khau yeu phai bi tu choi -------------------------------------------

$weak = Get-Status -Method POST -Path '/admins' -Body @{
  name = 'Mat khau yeu'; email = "yeu$stamp@thuemay.local"; password = 'abc'; role = 'STAFF'
} -Session $owner
if ($weak -eq 200) { throw 'Mat khau yeu phai bi tu choi' }

# --- Trung email phai bi tu choi --------------------------------------------

$dup = Get-Status -Method POST -Path '/admins' -Body @{
  name = 'Trung email'; email = $staffEmail; password = 'MatKhau@2026x'; role = 'STAFF'
} -Session $owner
if ($dup -eq 200) { throw 'Email trung phai bi tu choi' }

# --- Nhung viec nhan vien LAM DUOC ------------------------------------------

Assert-Allowed -Method GET -Path '/customers' -Label 'Xem khach hang'
Assert-Allowed -Method GET -Path '/devices' -Label 'Xem thiet bi'
Assert-Allowed -Method GET -Path '/rentals' -Label 'Xem don thue'
Assert-Allowed -Method GET -Path '/repairs' -Label 'Xem phieu sua'
Assert-Allowed -Method GET -Path '/parts' -Label 'Xem kho linh kien'
Assert-Allowed -Method GET -Path '/service-desk/overview' -Label 'Xem yeu cau ho tro'

$customer = Invoke-Api -Method POST -Path '/customers' -Body @{
  name = "Khach cua nhan vien $stamp"; phone = '0900000002'
} -Session $staff

$device = Invoke-Api -Method POST -Path '/devices' -Body @{
  name = "PC nhan vien $stamp"; type = 'PC'; hourlyRate = 10000; monthlyRate = 2000000
} -Session $staff

# Doi gia thue may — quyen nay chu da dong y cho nhan vien
Assert-Allowed -Method PATCH -Path "/devices/$($device.id)" -Body @{
  name = "PC nhan vien $stamp"; hourlyRate = 15000; monthlyRate = 2500000; status = 'AVAILABLE'
} -Label 'Doi gia thue may'

$rental = Invoke-Api -Method POST -Path '/rentals' -Body @{
  customerId = $customer.id
  deviceId = $device.id
  startAt = (Get-Date).ToUniversalTime().ToString('o')
  endAt = (Get-Date).AddDays(30).ToUniversalTime().ToString('o')
  baseAmount = 2500000
  status = 'ACTIVE'
} -Session $staff

# Thu tien cho don — viec hang ngay, phai lam duoc
Assert-Allowed -Method POST -Path "/rentals/$($rental.id)/payment" -Body @{
  amount = 500000; source = 'CASH'
} -Label 'Thu tien don thue'

# --- Nhung viec nhan vien BI CHAN -------------------------------------------

Assert-Forbidden -Method GET  -Path '/finance/transactions' -Label 'So giao dich'
Assert-Forbidden -Method GET  -Path '/finance/expenses' -Label 'So chi phi'
Assert-Forbidden -Method POST -Path '/finance/expenses' -Body @{
  category = 'ELECTRICITY'; amount = 100000; occurredAt = (Get-Date).ToUniversalTime().ToString('o')
} -Label 'Ghi chi phi'
Assert-Forbidden -Method POST -Path "/customers/$($customer.id)/deposit" -Body @{
  amount = 100000; paymentMethod = 'CASH'
} -Label 'Nap vi'
Assert-Forbidden -Method POST -Path "/rentals/$($rental.id)/refund" -Body @{
  amount = 100000; destination = 'CASH'; notes = 'thu hoan tien'
} -Label 'Hoan tien'
Assert-Forbidden -Method GET  -Path '/audit-logs' -Label 'Nhat ky thao tac'
Assert-Forbidden -Method GET  -Path '/network-lock' -Label 'Xem cau hinh khoa mang'
Assert-Forbidden -Method PUT  -Path '/network-lock/settings' -Body @{
  enabled = $false; autoLock = $true; lockCommand = 'x'; unlockCommand = 'x'; graceMinutes = 5; timeoutSeconds = 10
} -Label 'Sua cau hinh khoa mang'
Assert-Forbidden -Method POST -Path '/network-lock/sweep' -Label 'Chay quet khoa mang'
Assert-Forbidden -Method GET  -Path '/admins' -Label 'Xem danh sach tai khoan'
Assert-Forbidden -Method POST -Path '/admins' -Body @{
  name = 'Tu nang quyen'; email = "hack$stamp@thuemay.local"; password = 'MatKhau@2026x'; role = 'OWNER'
} -Label 'Tu tao tai khoan chu'
# Ban sao luu chua toan bo du lieu tien cua tiem nen phai chan nhu so tien.
Assert-Forbidden -Method GET  -Path '/backups' -Label 'Xem danh sach sao luu'
Assert-Forbidden -Method POST -Path '/backups' -Label 'Tao ban sao luu'
Assert-Forbidden -Method PUT  -Path '/backups/settings' -Body @{
  enabled = $false; dir = ''; intervalHours = 24; keep = 5
} -Label 'Sua cau hinh sao luu'

# --- Dashboard khong duoc lo con so tien ------------------------------------

$staffBoard = Invoke-Api -Method GET -Path '/dashboard' -Session $staff
Assert-Equal $false $staffBoard.canSeeMoney 'Co danh dau khong xem duoc tien'
foreach ($field in @('monthRevenue','monthProfit','monthCash','walletLiability','receivable','revenueByDevice')) {
  if ($null -ne $staffBoard.$field) { throw "Dashboard cua nhan vien khong duoc chua truong $field" }
}
if ($null -eq $staffBoard.deviceTotal) { throw 'Dashboard nhan vien van phai co so lieu van hanh' }

$ownerBoard = Invoke-Api -Method GET -Path '/dashboard' -Session $owner
Assert-Equal $true $ownerBoard.canSeeMoney 'Chu phai xem duoc tien'
if ($null -eq $ownerBoard.monthRevenue) { throw 'Dashboard cua chu phai co doanh thu' }

# --- Chu khong duoc tu ha quyen hay tu khoa minh ----------------------------

$self = (Invoke-Api -Method GET -Path '/admins' -Session $owner) | Where-Object { $_.email -eq 'admin@thuemay.local' }
$demote = Get-Status -Method PATCH -Path "/admins/$($self.id)" -Body @{
  name = $self.name; role = 'STAFF'; status = 'ACTIVE'
} -Session $owner
if ($demote -eq 200) { throw 'Khong duoc tu ha vai tro cua chinh minh' }

$lockSelf = Get-Status -Method PATCH -Path "/admins/$($self.id)" -Body @{
  name = $self.name; role = 'OWNER'; status = 'DISABLED'
} -Session $owner
if ($lockSelf -eq 200) { throw 'Khong duoc tu khoa tai khoan cua chinh minh' }

# Doi ten chinh minh thi van phai duoc
$rename = Get-Status -Method PATCH -Path "/admins/$($self.id)" -Body @{
  name = $self.name; role = 'OWNER'; status = 'ACTIVE'
} -Session $owner
Assert-Equal 200 $rename 'Tu doi ten minh van phai duoc'

# --- Khoa tai khoan nhan vien thi cat phien ngay -----------------------------

Invoke-Api -Method PATCH -Path "/admins/$($created.id)" -Body @{
  name = "Nhan vien $stamp"; role = 'STAFF'; status = 'DISABLED'
} -Session $owner | Out-Null

$afterLock = Get-Status -Method GET -Path '/customers' -Session $staff
if ($afterLock -ne 401) { throw "Phien cua tai khoan bi khoa phai het hieu luc ngay, nhan $afterLock" }

$reLogin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBlocked = Get-Status -Method POST -Path '/auth/login' -Body @{
  email = $staffEmail; password = $staffPass
} -Session $reLogin
if ($loginBlocked -eq 200) { throw 'Tai khoan bi khoa khong duoc dang nhap lai' }

[pscustomobject]@{
  Result            = 'PASS'
  StaffAccount      = $staffEmail
  StaffAllowed      = 'khach hang, thiet bi, don thue, thu tien, sua chua, doi gia may'
  StaffBlocked      = 'tai chinh, nap vi, hoan tien, nhat ky, khoa mang, tai khoan'
  MoneyHidden       = -not $staffBoard.canSeeMoney
  SelfDemoteBlocked = $true
  DisableCutsSession = $true
}
