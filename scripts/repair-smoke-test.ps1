# Kiểm thử nghiệp vụ sửa chữa và kho linh kiện.
# Cần server đang chạy tại cổng 8788. Script tạo dữ liệu thật nên chỉ chạy trên
# database thử nghiệm, không chạy trên dữ liệu kinh doanh.

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
  # Windows PowerShell gửi chuỗi body bằng bảng mã mặc định của hệ thống, làm
  # tiếng Việt lưu vào database bị méo. Tự mã hoá sang UTF-8 rồi gửi dạng byte.
  if ($null -ne $Body) {
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 6))
  }
  Invoke-RestMethod @params
}

# Invoke-RestMethod trả $null cho mảng JSON rỗng, mà @($null).Count lại bằng 1.
# Lọc bỏ phần tử rỗng trước khi đếm để danh sách trống ra đúng số 0.
function Count-Rows {
  param($Rows)
  @($Rows | Where-Object { $null -ne $_ }).Count
}

function Assert-Equal {
  param($Expected, $Actual, [string]$Label)
  if ($Expected -ne $Actual) { throw "$Label : mong đợi $Expected nhưng nhận $Actual" }
}

$health = Invoke-Api -Method GET -Path '/health'
if (-not $health.ok) { throw 'Health check failed' }

Invoke-Api -Method POST -Path '/auth/login' -Body @{
  email = 'admin@thuemay.local'
  password = 'Admin@123'
} | Out-Null

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

# --- Chuẩn bị: một máy và một loại linh kiện ---------------------------------

$device = Invoke-Api -Method POST -Path '/devices' -Body @{
  name = "PC Repair $stamp"
  type = 'PC'
  specs = 'Máy dùng cho kiểm thử sửa chữa'
  hourlyRate = 20000
  monthlyRate = 3000000
  purchasePrice = 20000000
}

$part = Invoke-Api -Method POST -Path '/parts' -Body @{
  name = "RAM Repair $stamp"
  category = 'RAM'
  unit = 'thanh'
  minQuantity = 4
  location = 'Kệ A1'
}

$expensesBefore = [int](Invoke-Api -Method GET -Path '/finance/expenses').total

# --- Nhập kho: 10 thanh x 500.000 = 5.000.000, phải sinh 1 khoản chi ---------

Invoke-Api -Method POST -Path "/parts/$($part.id)/movements" -Body @{
  kind = 'PURCHASE'
  quantity = 10
  unitCost = 500000
  paymentMethod = 'CASH'
  vendor = 'Cửa hàng kiểm thử'
} | Out-Null

$stock = (Invoke-Api -Method GET -Path '/parts') | Where-Object { $_.id -eq $part.id }
Assert-Equal 10 $stock.quantity 'Tồn kho sau khi nhập'
Assert-Equal 500000 $stock.average_cost 'Giá vốn bình quân'

$expensesAfterPurchase = [int](Invoke-Api -Method GET -Path '/finance/expenses').total
Assert-Equal ($expensesBefore + 1) $expensesAfterPurchase 'Nhập mua phải sinh đúng 1 khoản chi'

# --- Tạo phiếu sửa, máy phải chuyển sang Bảo trì -----------------------------

$repair = Invoke-Api -Method POST -Path '/repairs' -Body @{
  deviceId = $device.id
  title = 'Máy không lên nguồn'
  symptom = 'Bật không có tín hiệu, quạt không quay'
  vendor = 'Thợ kiểm thử'
  startNow = $true
}

$deviceAfterOpen = (Invoke-Api -Method GET -Path '/devices') | Where-Object { $_.id -eq $device.id }
Assert-Equal 'MAINTENANCE' $deviceAfterOpen.status 'Máy phải chuyển sang Bảo trì khi bắt đầu sửa'
Assert-Equal 1 $deviceAfterOpen.open_repairs 'Máy phải có 1 phiếu đang mở'

# --- Lắp 2 thanh RAM, kho còn 8, chi phí linh kiện 1.000.000 -----------------

Invoke-Api -Method POST -Path "/repairs/$($repair.id)/parts" -Body @{
  partId = $part.id
  quantity = 2
} | Out-Null

$stockAfterUse = (Invoke-Api -Method GET -Path '/parts') | Where-Object { $_.id -eq $part.id }
Assert-Equal 8 $stockAfterUse.quantity 'Tồn kho sau khi lắp 2 thanh'

$detail = Invoke-Api -Method GET -Path "/repairs/$($repair.id)"
Assert-Equal 1000000 $detail.parts_cost 'Giá vốn linh kiện trong phiếu'

$expensesAfterUse = [int](Invoke-Api -Method GET -Path '/finance/expenses').total
Assert-Equal $expensesAfterPurchase $expensesAfterUse 'Lắp linh kiện không được sinh thêm chi phí'

# --- Lắp thừa rồi gỡ ra, tồn kho phải quay lại 8 -----------------------------

Invoke-Api -Method POST -Path "/repairs/$($repair.id)/parts" -Body @{
  partId = $part.id
  quantity = 1
} | Out-Null

$detailWithExtra = Invoke-Api -Method GET -Path "/repairs/$($repair.id)"
$extraLine = $detailWithExtra.parts | Where-Object { $_.kind -eq 'CONSUME' -and $_.quantity -eq -1 } | Select-Object -First 1
Invoke-Api -Method DELETE -Path "/repairs/$($repair.id)/parts/$($extraLine.id)" | Out-Null

$stockAfterReturn = (Invoke-Api -Method GET -Path '/parts') | Where-Object { $_.id -eq $part.id }
Assert-Equal 8 $stockAfterReturn.quantity 'Tồn kho sau khi gỡ linh kiện thừa'

$detailAfterReturn = Invoke-Api -Method GET -Path "/repairs/$($repair.id)"
Assert-Equal 1000000 $detailAfterReturn.parts_cost 'Giá vốn linh kiện sau khi gỡ phần thừa'

# --- Không được vượt tồn kho ------------------------------------------------

$overdrawBlocked = $false
try {
  Invoke-Api -Method POST -Path "/repairs/$($repair.id)/parts" -Body @{ partId = $part.id; quantity = 999 } | Out-Null
} catch { $overdrawBlocked = $true }
if (-not $overdrawBlocked) { throw 'Phải chặn lắp nhiều hơn số tồn kho' }

# --- Đóng phiếu với tiền công 300.000 ---------------------------------------

Invoke-Api -Method PATCH -Path "/repairs/$($repair.id)/status" -Body @{
  status = 'DONE'
  serviceCost = 300000
  vendor = 'Thợ kiểm thử'
  paymentMethod = 'CASH'
  resolution = 'Thay nguồn và vệ sinh'
} | Out-Null

$expensesAfterClose = [int](Invoke-Api -Method GET -Path '/finance/expenses').total
Assert-Equal ($expensesAfterPurchase + 1) $expensesAfterClose 'Đóng phiếu phải sinh đúng 1 khoản chi tiền công'

$deviceAfterClose = (Invoke-Api -Method GET -Path '/devices') | Where-Object { $_.id -eq $device.id }
Assert-Equal 'AVAILABLE' $deviceAfterClose.status 'Máy phải trở lại Sẵn sàng sau khi sửa xong'
Assert-Equal 0 $deviceAfterClose.open_repairs 'Máy không còn phiếu đang mở'
Assert-Equal 1300000 $deviceAfterClose.repair_cost 'Tổng tiền đã sửa của máy'

# --- Phiếu đã đóng thì khoá lại ---------------------------------------------

$closedLocked = $false
try {
  Invoke-Api -Method POST -Path "/repairs/$($repair.id)/parts" -Body @{ partId = $part.id; quantity = 1 } | Out-Null
} catch { $closedLocked = $true }
if (-not $closedLocked) { throw 'Phiếu đã đóng thì không được lắp thêm linh kiện' }

# --- Cảnh báo tồn kho tối thiểu ---------------------------------------------

Invoke-Api -Method POST -Path "/parts/$($part.id)/movements" -Body @{
  kind = 'ADJUST'
  quantity = -5
  notes = 'Kiểm kê phát hiện thiếu'
} | Out-Null

$dashboard = Invoke-Api -Method GET -Path '/dashboard'
if ($dashboard.lowStockParts -lt 1) { throw 'Phải cảnh báo linh kiện dưới mức tồn tối thiểu' }

[pscustomobject]@{
  Result          = 'PASS'
  Repair          = $repair.code
  Part            = $part.code
  StockLeft       = ((Invoke-Api -Method GET -Path '/parts') | Where-Object { $_.id -eq $part.id }).quantity
  DeviceRepairCost = $deviceAfterClose.repair_cost
  MonthRepairSpend = $dashboard.monthRepairSpend
  LowStockParts    = $dashboard.lowStockParts
}
