$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:8788/api'
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$customerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-PortalApi {
  param([string]$Method, [string]$Path, [object]$Body, [Microsoft.PowerShell.Commands.WebRequestSession]$Session)
  $params = @{ Method = $Method; Uri = "$baseUrl$Path"; WebSession = $Session; ContentType = 'application/json' }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 7) }
  Invoke-RestMethod @params
}

Invoke-PortalApi POST '/auth/login' @{ email = 'admin@thuemay.local'; password = 'Admin@123' } $adminSession | Out-Null
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$device = Invoke-PortalApi POST '/devices' @{
  name = "Portal PC $stamp"; type = 'PC'; specs = 'Ryzen 7 / RAM 32GB / RTX 4060'
  ipAddress = '10.88.0.10'; accessNote = 'No public access'; hourlyRate = 30000
  monthlyRate = 3000000; purchasePrice = 22000000; notes = 'Portal automated test'
} $adminSession

$customerEmail = "portal$stamp@example.com"
$customerPassword = 'PortalPass123'
$customer = Invoke-PortalApi POST '/customer/auth/register' @{
  name = "Portal Customer $stamp"; phone = '0900000000'; email = $customerEmail; password = $customerPassword
} $customerSession

$catalog = Invoke-PortalApi GET '/customer/catalog' $null $customerSession
$catalogDevice = $catalog | Where-Object id -eq $device.id
if ($null -eq $catalogDevice) { throw 'New device is missing from customer catalog' }

$start = [DateTime]::UtcNow.AddMinutes(10)
$end = $start.AddMonths(1)
$booking = Invoke-PortalApi POST '/customer/bookings' @{
  deviceId = $device.id; billingMode = 'MONTHLY'; startAt = $start.ToString('o'); endAt = $end.ToString('o'); note = 'Portal test booking'
} $customerSession

$desk = Invoke-PortalApi GET '/service-desk/overview' $null $adminSession
# Danh sach chuyen sang tra theo trang: { rows, total }, khong con la mang phang.
$deskBooking = $desk.bookings.rows | Where-Object id -eq $booking.id
if ($null -eq $deskBooking) { throw 'Booking is missing from service desk overview' }
if ($deskBooking.status -ne 'PENDING') { throw "Booking status mismatch: $($deskBooking.status)" }

$approved = Invoke-PortalApi POST "/service-desk/bookings/$($booking.id)/approve" @{
  quotedAmount = 3000000; adminNote = 'Da xac nhan lich may'; accessNote = 'Gateway: vpn.local / User: portal-test'
} $adminSession

Invoke-PortalApi POST "/customers/$($customer.customerId)/deposit" @{
  amount = 4000000; paymentMethod = 'BANK'; reference = "PORTAL-$stamp"; notes = 'Portal automated test'
} $adminSession | Out-Null

$rentals = Invoke-PortalApi GET '/customer/rentals' $null $customerSession
$rental = $rentals | Where-Object id -eq $approved.rentalId
if ($rental.total_amount -ne 3000000) { throw "Rental total mismatch: $($rental.total_amount)" }
if ($rental.access_note -notmatch 'vpn.local') { throw 'Rental access note was not delivered' }

Invoke-PortalApi POST "/customer/rentals/$($rental.id)/pay-with-wallet" @{ amount = 3000000 } $customerSession | Out-Null

$requestedEnd = ([DateTime]$rental.end_at).AddMonths(1)
$extension = Invoke-PortalApi POST "/customer/rentals/$($rental.id)/extensions" @{
  requestedEndAt = $requestedEnd.ToUniversalTime().ToString('o'); note = 'Can them mot thang'
} $customerSession

Invoke-PortalApi POST "/service-desk/extensions/$($extension.id)/approve" @{
  additionalAmount = 500000; adminNote = 'Da giu lich them mot thang'
} $adminSession | Out-Null

$ticket = Invoke-PortalApi POST '/customer/tickets' @{
  rentalId = $rental.id; subject = 'Kiem tra ket noi may'; category = 'TECHNICAL'; priority = 'NORMAL'; message = 'Toi can doi van hanh kiem tra ket noi.'
} $customerSession

Invoke-PortalApi POST "/service-desk/tickets/$($ticket.id)/messages" @{
  body = 'Da kiem tra, ket noi dang hoat dong binh thuong.'
} $adminSession | Out-Null

$finalRentals = Invoke-PortalApi GET '/customer/rentals' $null $customerSession
$finalRental = $finalRentals | Where-Object id -eq $rental.id
$messages = Invoke-PortalApi GET "/customer/tickets/$($ticket.id)/messages" $null $customerSession
$notifications = Invoke-PortalApi GET '/customer/notifications' $null $customerSession
$me = Invoke-PortalApi GET '/customer/auth/me' $null $customerSession

if ($finalRental.total_amount -ne 3500000) { throw "Extended total mismatch: $($finalRental.total_amount)" }
if ($finalRental.paid_amount -ne 3000000) { throw "Paid total mismatch: $($finalRental.paid_amount)" }
if ($me.walletBalance -ne 1000000) { throw "Portal wallet mismatch: $($me.walletBalance)" }
if ($messages.Count -ne 2) { throw "Ticket message mismatch: $($messages.Count)" }
if (@($notifications | Where-Object { $_.kind -eq 'SUPPORT_REPLY' }).Count -lt 1) { throw 'Support notification missing' }

# Doi mat khau tu cong khach hang
$newPassword = 'MatKhauMoi@2026'
$secondDevice = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-PortalApi POST '/customer/auth/login' @{ email = $customerEmail; password = $customerPassword } $secondDevice | Out-Null

$rejected = $false
try {
  Invoke-PortalApi POST '/customer/auth/change-password' @{
    currentPassword = 'SaiBetNhe@1'; newPassword = $newPassword
  } $customerSession | Out-Null
} catch { $rejected = $true }
if (-not $rejected) { throw 'Wrong current password must be rejected' }

Invoke-PortalApi POST '/customer/auth/change-password' @{
  currentPassword = $customerPassword; newPassword = $newPassword
} $customerSession | Out-Null

# Phien dang thao tac giu lai, phien thiet bi khac bi cat
Invoke-PortalApi GET '/customer/auth/me' $null $customerSession | Out-Null
$otherDeviceCut = $false
try { Invoke-PortalApi GET '/customer/auth/me' $null $secondDevice | Out-Null } catch { $otherDeviceCut = $true }
if (-not $otherDeviceCut) { throw 'Other device session must be cut after password change' }

# Mat khau cu chet, mat khau moi song
$freshSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$oldDead = $false
try {
  Invoke-PortalApi POST '/customer/auth/login' @{ email = $customerEmail; password = $customerPassword } $freshSession | Out-Null
} catch { $oldDead = $true }
if (-not $oldDead) { throw 'Old password must stop working' }
Invoke-PortalApi POST '/customer/auth/login' @{ email = $customerEmail; password = $newPassword } $freshSession | Out-Null

$securityNotice = Invoke-PortalApi GET '/customer/notifications' $null $freshSession
if (@($securityNotice | Where-Object { $_.kind -eq 'SECURITY' }).Count -lt 1) { throw 'Security notification missing' }

[PSCustomObject]@{
  Result = 'PASS'
  PasswordChange = 'OK'
  Booking = $booking.code
  Rental = $approved.rentalCode
  RentalTotal = $finalRental.total_amount
  PaidAmount = $finalRental.paid_amount
  WalletBalance = $me.walletBalance
  Ticket = $ticket.code
  TicketMessages = $messages.Count
  Notifications = $notifications.Count
} | Format-List
