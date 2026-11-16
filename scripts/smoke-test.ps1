$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:8788/api'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Api {
  param([string]$Method, [string]$Path, [object]$Body)
  $params = @{
    Method = $Method
    Uri = "$baseUrl$Path"
    WebSession = $session
    ContentType = 'application/json'
  }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 6) }
  Invoke-RestMethod @params
}

$health = Invoke-Api -Method GET -Path '/health'
if (-not $health.ok) { throw 'Health check failed' }

Invoke-Api -Method POST -Path '/auth/login' -Body @{
  email = 'admin@thuemay.local'
  password = 'Admin@123'
} | Out-Null

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$customer = Invoke-Api -Method POST -Path '/customers' -Body @{
  name = "Khach Smoke $stamp"
  phone = '0900000000'
  email = "smoke$stamp@example.com"
  company = 'Smoke Test'
  creditLimit = 0
  notes = 'Automated smoke test'
}

$device = Invoke-Api -Method POST -Path '/devices' -Body @{
  name = "PC Smoke $stamp"
  type = 'PC'
  specs = 'Ryzen 7 / 32GB / RTX 4060'
  ipAddress = '10.99.0.10'
  accessNote = 'Smoke test only'
  hourlyRate = 30000
  monthlyRate = 3200000
  purchasePrice = 22000000
  notes = 'Automated smoke test'
}

Invoke-Api -Method POST -Path "/customers/$($customer.id)/deposit" -Body @{
  amount = 5000000
  paymentMethod = 'BANK'
  reference = "SMOKE-$stamp"
  notes = 'Automated smoke test'
} | Out-Null

$start = [DateTime]::UtcNow
$end = $start.AddMonths(1)
$rental = Invoke-Api -Method POST -Path '/rentals' -Body @{
  customerId = $customer.id
  deviceId = $device.id
  startAt = $start.ToString('o')
  endAt = $end.ToString('o')
  baseAmount = 3200000
  surcharge = 0
  discount = 0
  status = 'ACTIVE'
  accessNote = 'Smoke access'
  notes = 'Automated smoke test'
}

Invoke-Api -Method POST -Path "/rentals/$($rental.id)/payment" -Body @{
  amount = 3200000
  source = 'WALLET'
  reference = "SMOKE-RENT-$stamp"
  notes = 'Automated smoke test'
} | Out-Null

Invoke-Api -Method POST -Path "/rentals/$($rental.id)/refund" -Body @{
  amount = 200000
  destination = 'WALLET'
  reference = "SMOKE-REFUND-$stamp"
  notes = 'Hoan tien kiem thu'
} | Out-Null

Invoke-Api -Method POST -Path '/finance/expenses' -Body @{
  category = 'ELECTRICITY'
  amount = 500000
  paymentMethod = 'BANK'
  vendor = 'Smoke Vendor'
  reference = "SMOKE-EXP-$stamp"
  notes = 'Automated smoke test'
  occurredAt = $start.ToString('o')
} | Out-Null

$dashboard = Invoke-Api -Method GET -Path '/dashboard'
$customers = Invoke-Api -Method GET -Path '/customers'
$devices = Invoke-Api -Method GET -Path '/devices'
$rentals = Invoke-Api -Method GET -Path '/rentals'

$testedCustomer = $customers | Where-Object id -eq $customer.id
$testedDevice = $devices | Where-Object id -eq $device.id
$testedRental = $rentals | Where-Object id -eq $rental.id

if ($testedCustomer.wallet_balance -ne 2000000) { throw "Wallet mismatch: $($testedCustomer.wallet_balance)" }
if ($testedCustomer.total_spent -ne 3000000) { throw "Customer revenue mismatch: $($testedCustomer.total_spent)" }
if ($testedDevice.status -ne 'RENTED') { throw "Device status mismatch: $($testedDevice.status)" }
if ($testedDevice.lifetime_revenue -ne 3000000) { throw "Device revenue mismatch: $($testedDevice.lifetime_revenue)" }
if ($testedRental.paid_amount -ne 3000000) { throw "Rental payment mismatch: $($testedRental.paid_amount)" }
if ($dashboard.monthRevenue -lt 3000000) { throw "Dashboard revenue mismatch: $($dashboard.monthRevenue)" }

[PSCustomObject]@{
  Result = 'PASS'
  CustomerWallet = $testedCustomer.wallet_balance
  RentalPaid = $testedRental.paid_amount
  DeviceStatus = $testedDevice.status
  MonthRevenue = $dashboard.monthRevenue
  MonthExpenses = $dashboard.monthExpenses
} | Format-List
