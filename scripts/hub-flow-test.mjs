/**
 * Kiểm thử tích hợp cho giao diện ThueMayHub-FE: đi hết các luồng giao diện dùng,
 * qua API thật, đóng vai quản trị, nhân viên, khách cũ và khách mới đăng ký.
 *
 * Cần bản hoàn chỉnh đang chạy (`npm run hub` hoặc `npm run hub:start`). Bài test ghi thêm
 * dữ liệu vào `data/hub-demo.db`; chạy xong thì `npm run hub:reset` để về dữ liệu mẫu.
 *
 *   npm run test:hub
 */
const BASE = process.env.HUB_API_BASE || 'http://127.0.0.1:8789/api';
let failures = 0;

function client() {
  const jar = new Map();
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (v) jar.set(k, v); else jar.delete(k);
    }
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  };
}

function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

/** CRC-16/CCITT-FALSE, tính độc lập với server để kiểm lại chuỗi VietQR. */
function crc16(text) {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

for (let i = 0; i < 40; i++) {
  try { await fetch(`${BASE}/health`); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
}

/* ---- Quản trị ---- */
const admin = client();
let r = await admin('/hub/login', { method: 'POST', body: { identity: 'admin', password: 'demo123' } });
check('Admin đăng nhập bằng username', r.status === 200 && r.data.role === 'Admin', `${r.status} ${r.data?.user?.name}`);
r = await admin('/hub/me');
check('Admin /hub/me giữ phiên', r.data?.role === 'Admin');
r = await admin('/hub/login', { method: 'POST', body: { identity: 'admin', password: 'sai' } });
check('Sai mật khẩu bị từ chối', r.status === 401, r.data?.message);
r = await admin('/hub/login', { method: 'POST', body: { identity: 'admin@thuemayhub.com', password: 'demo123' } });
check('Admin đăng nhập bằng email', r.data?.role === 'Admin');

const devices = (await admin('/devices')).data;
check('Danh sách máy có phân nhóm và vị trí', devices.length === 7 && devices.some((d) => d.category === 'Gaming' && d.location));
const payments = (await admin('/hub/payments')).data;
check('Danh sách phiếu thu', payments.length === 5, `${payments.length} phiếu`);
const desk = (await admin('/service-desk/overview?limit=500')).data;
const pending = desk.bookings.rows.find((b) => b.status === 'PENDING');
check('Có yêu cầu thuê chờ duyệt', Boolean(pending), pending?.code);

r = await admin('/devices', { method: 'POST', body: { name: 'PC Test RTX 4070', type: 'PC', category: 'Gaming', location: 'Tầng 3', monthlyRate: 7000000, hourlyRate: 50000 } });
check('Thêm máy mới', r.status === 201, r.data?.code);
const newDevice = (await admin('/devices')).data.find((d) => d.name === 'PC Test RTX 4070');
check('Máy mới lưu đủ phân nhóm/vị trí', newDevice?.category === 'Gaming' && newDevice?.location === 'Tầng 3');

r = await admin('/customers', { method: 'POST', body: { name: 'Khách Kiểm Thử', phone: '0909000111', email: 'test@email.com' } });
check('Thêm khách hàng', r.status === 201, r.data?.code);
const customers = (await admin('/customers')).data;
const testCustomer = customers.find((c) => c.name === 'Khách Kiểm Thử');

const start = new Date();
const end = new Date(start.getTime() + 7 * 86_400_000);
r = await admin('/rentals', { method: 'POST', body: { customerId: testCustomer.id, deviceId: newDevice.id, startAt: start.toISOString(), endAt: end.toISOString(), baseAmount: Math.round(7000000 / 30 * 7), status: 'ACTIVE', notes: 'test' } });
check('Tạo đơn thuê (máy chuyển Đang thuê)', r.status === 201, r.data?.code);
const rental = (await admin('/rentals')).data.find((x) => x.code === r.data.code);
check('Máy mới đã sang RENTED', (await admin('/devices')).data.find((d) => d.id === newDevice.id).status === 'RENTED');

r = await admin(`/rentals/${rental.id}/payment`, { method: 'POST', body: { amount: 500000, source: 'CASH' } });
check('Thu tiền mặt', r.status === 201);
r = await admin(`/rentals/${rental.id}/payment`, { method: 'POST', body: { amount: 99_000_000, source: 'CASH' } });
check('Chặn thu vượt số còn nợ', r.status === 400, r.data?.message);
r = await admin(`/rentals/${rental.id}/payment`, { method: 'POST', body: { amount: 100000, source: 'WALLET' } });
check('Chặn trừ ví khi ví không đủ', r.status === 400, r.data?.message);
r = await admin(`/customers/${testCustomer.id}/deposit`, { method: 'POST', body: { amount: 300000, paymentMethod: 'BANK' } });
check('Admin nạp ví', r.status === 201, `số dư ${r.data?.walletBalance}`);
r = await admin(`/rentals/${rental.id}/payment`, { method: 'POST', body: { amount: 100000, source: 'WALLET' } });
check('Trừ ví khi đủ tiền', r.status === 201);

r = await admin('/repairs', { method: 'POST', body: { deviceId: devices.find((d) => d.code === 'PC-002').id, title: 'Lỗi quạt kêu to', vendor: 'Lê Minh Tuấn', priority: 'HIGH', serviceCost: 150000, startNow: true } });
check('Tạo phiếu sửa có ưu tiên + chi phí', r.status === 201, r.data?.code);
const repairs = (await admin('/repairs?limit=500')).data.rows;
const repair = repairs.find((x) => x.code === r.data.code);
check('Phiếu sửa lưu đúng ưu tiên/chi phí', repair?.priority === 'HIGH' && repair?.service_cost === 150000 && repair?.status === 'IN_PROGRESS');
r = await admin(`/repairs/${repair.id}/status`, { method: 'PATCH', body: { status: 'DONE', serviceCost: 180000, vendor: 'Lê Minh Tuấn' } });
check('Đóng phiếu sửa', r.status === 200);

r = await admin(`/service-desk/bookings/${pending.id}/approve`, { method: 'POST', body: { quotedAmount: 790000, adminNote: 'Hẹn 14h nhận máy' } });
check('Duyệt yêu cầu thuê → sinh đơn', r.status === 201, r.data?.rentalCode);
r = await admin(`/rentals/${r.data.rentalId}/status`, { method: 'PATCH', body: { status: 'ACTIVE' } });
check('Giao máy (RESERVED → ACTIVE)', r.status === 200);

check('Admin xem được danh sách nhân viên', (await admin('/admins')).data.some((a) => a.username === 'phat'));
check('Admin xem được kho linh kiện', (await admin('/parts')).data.length === 4);

/* ---- Nhân viên ---- */
const staff = client();
r = await staff('/hub/login', { method: 'POST', body: { identity: 'phat', password: 'demo123' } });
check('Nhân viên đăng nhập', r.data?.role === 'Staff', r.data?.user?.name);
check('Nhân viên xem được phiếu thu', (await staff('/hub/payments')).status === 200);
check('Nhân viên bị chặn danh sách nhân viên', (await staff('/admins')).status === 403);
check('Nhân viên bị chặn nạp ví', (await staff(`/customers/${testCustomer.id}/deposit`, { method: 'POST', body: { amount: 1000 } })).status === 403);
check('Nhân viên bị chặn sổ tài chính', (await staff('/finance/transactions')).status === 403);

/* ---- Khách ---- */
const guest = client();
r = await guest('/hub/login', { method: 'POST', body: { identity: '0902 345 678', password: 'demo123' } });
check('Khách đăng nhập bằng số điện thoại', r.data?.role === 'Customer' && r.data.user.wallet === 1250000, `ví ${r.data?.user?.wallet}`);
const catalog = (await guest('/customer/catalog')).data;
check('Khách thấy máy trống', catalog.length > 0 && catalog.every((d) => d.status === 'AVAILABLE'), `${catalog.length} máy`);
check('Khách không gọi được API quản trị', (await guest('/devices')).status === 401);
const s = new Date(Date.now() + 60_000);
r = await guest('/customer/bookings', { method: 'POST', body: { deviceId: catalog[0].id, billingMode: 'MONTHLY', startAt: s.toISOString(), endAt: new Date(s.getTime() + 3 * 86_400_000).toISOString(), note: 'test' } });
check('Khách gửi yêu cầu thuê', r.status === 201, r.data?.code);
check('Khách thấy đơn của mình', (await guest('/customer/rentals')).data.length >= 1);

const fresh = client();
r = await fresh('/hub/register', { method: 'POST', body: { phone: '0911222333', email: 'moi@email.com', password: 'abc123' } });
check('Đăng ký khách mới', r.status === 201 && r.data.user.profileComplete === false, r.data?.message ?? '');
r = await fresh('/hub/register', { method: 'POST', body: { phone: '0911222333', email: 'khac@email.com', password: 'abc123' } });
check('Chặn đăng ký trùng số điện thoại', r.status === 409, r.data?.message);
r = await fresh('/hub/profile', { method: 'PATCH', body: { name: 'Khách Mới', phone: '0911222333', email: 'moi@email.com', address: 'Q.1', identityNumber: '079123456789' } });
check('Hoàn thiện hồ sơ', r.status === 200 && r.data.profileComplete === true);
r = await fresh('/hub/profile', { method: 'PATCH', body: { name: 'Khách Mới', phone: '0911222333', identityNumber: '12ab' } });
check('Chặn CCCD sai định dạng', r.status === 400, r.data?.message);
r = await fresh('/hub/logout', { method: 'POST' });
check('Đăng xuất', (await fresh('/hub/me')).data?.role === null);
const pendingRow = (await admin('/service-desk/overview?limit=500')).data.bookings.rows.find((b) => b.status === 'PENDING');
check('Yêu cầu chờ duyệt có giá tháng của máy để tạm tính', Number(pendingRow?.device_monthly_rate) > 0);

/* ---- Các chức năng hoàn thiện theo Figma ---- */

// Sửa từng phần: chỉ gửi trường cần đổi, các trường khác phải giữ nguyên.
r = await admin(`/customers/${testCustomer.id}`, { method: 'PATCH', body: { address: '12 Lê Lợi, Q.1', identityNumber: '079123456780' } });
let cust = (await admin('/customers')).data.find((c) => c.id === testCustomer.id);
check('Sửa khách từng phần giữ nguyên tên và SĐT', r.status === 200 && cust.name === 'Khách Kiểm Thử' && cust.phone === '0909000111' && cust.identity_number === '079123456780');
r = await admin(`/customers/${testCustomer.id}`, { method: 'PATCH', body: { identityNumber: '12ab' } });
check('Chặn CCCD sai khi quầy sửa hồ sơ', r.status === 400, r.data?.message);
r = await admin(`/customers/${testCustomer.id}`, { method: 'PATCH', body: { status: 'BLOCKED' } });
cust = (await admin('/customers')).data.find((c) => c.id === testCustomer.id);
check('Khoá khách mà không mất địa chỉ', cust.status === 'BLOCKED' && cust.address === '12 Lê Lợi, Q.1');
await admin(`/customers/${testCustomer.id}`, { method: 'PATCH', body: { status: 'ACTIVE' } });

r = await admin(`/devices/${newDevice.id}`, { method: 'PATCH', body: { location: 'Tầng 4', category: 'Đồ hoạ' } });
let dev = (await admin('/devices')).data.find((d) => d.id === newDevice.id);
check('Sửa máy từng phần giữ nguyên giá và trạng thái', r.status === 200 && dev.location === 'Tầng 4' && dev.monthly_rate === 7000000 && dev.status === 'RENTED');

// Gia hạn tại quầy kèm thu tiền, rồi hoàn một phần — danh sách phiếu thu phải có cả phiếu hoàn.
r = await admin(`/rentals/${rental.id}/renew`, { method: 'POST', body: { unit: 'WEEK', quantity: 1, amount: 1_600_000, from: 'END', collect: { source: 'CASH' } } });
check('Gia hạn tại quầy, thu tiền ngay', r.status === 201 && r.data.collected === true);
r = await admin(`/rentals/${rental.id}/refund`, { method: 'POST', body: { amount: 200_000, destination: 'WALLET', notes: 'Trả máy sớm' } });
check('Hoàn tiền về ví', r.status === 201, r.data?.code);
const refunds = (await admin('/hub/payments')).data.filter((p) => p.kind === 'REFUND');
check('Danh sách phiếu thu có phiếu hoàn (số âm)', refunds.length === 1 && refunds[0].amount === -200_000);
r = await admin(`/hub/wallet?customerId=${testCustomer.id}`);
check('Quầy xem lịch sử ví của khách', r.status === 200 && r.data.balance === 400_000 && r.data.rows.length === 3, `số dư ${r.data?.balance}`);

// Duyệt gia hạn khách gửi (GH-1001 trong dữ liệu mẫu).
const desk2 = (await admin('/service-desk/overview?limit=500')).data;
const ext = desk2.extensions.rows.find((e) => e.status === 'PENDING');
r = await admin(`/service-desk/extensions/${ext.id}/approve`, { method: 'POST', body: { additionalAmount: 1_200_000, adminNote: 'OK' } });
const extRental = (await admin('/rentals')).data.find((x) => x.id === ext.rental_id);
check('Duyệt gia hạn: hạn đơn dời tới ngày khách xin', r.status === 200 && extRental.end_at === ext.requested_end_at);

// Hỗ trợ: quầy trả lời ticket của khách.
const ticket = desk2.tickets.rows.find((t) => t.status === 'OPEN');
r = await admin(`/service-desk/tickets/${ticket.id}/messages`, { method: 'POST', body: { body: 'Cửa hàng đã kiểm tra, máy chạy ổn rồi ạ.' } });
check('Quầy trả lời yêu cầu hỗ trợ', r.status === 201);

// Tài khoản nhân viên có username, đăng nhập được bằng username đó.
r = await admin('/admins', { method: 'POST', body: { name: 'Nhân Viên Mới', username: 'nvmoi', email: 'nvmoi@thuemayhub.com', password: 'MatKhau12345', role: 'STAFF' } });
check('Tạo nhân viên có username', r.status === 201, r.data?.message ?? '');
r = await admin('/admins', { method: 'POST', body: { name: 'Trùng', username: 'nvmoi', email: 'khac@thuemayhub.com', password: 'MatKhau12345', role: 'STAFF' } });
check('Chặn username trùng', r.status === 400, r.data?.message);
r = await client()('/hub/login', { method: 'POST', body: { identity: 'nvmoi', password: 'MatKhau12345' } });
check('Nhân viên mới đăng nhập bằng username', r.data?.role === 'Staff');

// Thông tin cửa hàng: ai cũng đọc được, chỉ chủ được sửa.
check('Đọc thông tin cửa hàng', (await fresh('/hub/shop')).data?.hotline === '0901 000 001');
check('Nhân viên không sửa được thông tin cửa hàng', (await staff('/hub/shop', { method: 'PUT', body: { name: 'X' } })).status === 403);
r = await admin('/hub/shop', { method: 'PUT', body: { name: 'Thuê Máy Hub', address: 'Q.1', hotline: '0901 000 002', email: 'hotro@thuemayhub.com', hours: '8h–22h' } });
check('Chủ sửa thông tin cửa hàng', r.status === 200 && r.data.hotline === '0901 000 002');

/* ---- Cổng khách ---- */
const myRentals = (await guest('/customer/rentals')).data;
const owing = myRentals.find((x) => x.total_amount > x.paid_amount && x.status === 'ACTIVE');
r = await guest(`/customer/rentals/${owing.id}/pay-with-wallet`, { method: 'POST', body: { amount: 250_000 } });
check('Khách trả đơn bằng ví', r.status === 201 && r.data.walletBalance === 1_000_000, `ví còn ${r.data?.walletBalance}`);
r = await guest('/hub/wallet');
check('Khách xem lịch sử ví', r.status === 200 && r.data.balance === 1_000_000 && r.data.rows.some((w) => w.kind === 'RENTAL_PAYMENT'));
r = await guest(`/customer/rentals/${owing.id}/extensions`, {
  method: 'POST', body: { requestedEndAt: new Date(new Date(owing.end_at).getTime() + 5 * 86_400_000).toISOString(), note: 'test' },
});
check('Khách xin gia hạn', r.status === 201, r.data?.code);
const myBooking = (await guest('/customer/bookings')).data.find((b) => b.status === 'PENDING');
r = await guest(`/customer/bookings/${myBooking.id}/cancel`, { method: 'PATCH' });
check('Khách huỷ yêu cầu chưa duyệt', r.status === 200);
r = await guest('/customer/tickets', { method: 'POST', body: { subject: 'Hỏi về gói tháng', category: 'GENERAL', message: 'Cho em hỏi giá gói 3 tháng ạ.' } });
check('Khách gửi yêu cầu hỗ trợ', r.status === 201, r.data?.code);
const mine = (await guest('/customer/tickets')).data.find((t) => t.code === 'HT-1001');
check('Khách thấy cửa hàng đã trả lời', mine?.status === 'WAITING_CUSTOMER');
check('Danh sách ticket của khách cho biết tin cuối do cửa hàng gửi', mine?.last_author === 'ADMIN' && mine?.last_message?.includes('máy chạy ổn'));
r = await guest(`/customer/tickets/${mine.id}/messages`, { method: 'POST', body: { body: 'Em cảm ơn, máy chạy được rồi.' } });
const deskTickets = (await admin('/service-desk/tickets?limit=500')).data;
const fromCustomer = deskTickets.find((t) => t.code === 'HT-1001');
check('Quầy hỏi riêng danh sách ticket: thấy tin mới của khách', r.status === 201 && fromCustomer?.last_author === 'CUSTOMER' && fromCustomer?.status === 'OPEN', fromCustomer?.last_message);
check('Nhân viên cũng hỏi được danh sách ticket', (await staff('/service-desk/tickets')).status === 200);
check('Khách không gọi được danh sách ticket của quầy', (await guest('/service-desk/tickets')).status === 401);
check('Khách có thông báo trả lời hỗ trợ', (await guest('/customer/notifications')).data.some((n) => n.kind === 'SUPPORT_REPLY'));
check('Danh mục máy có phân nhóm và vị trí', (await guest('/customer/catalog')).data.every((d) => 'category' in d && 'location' in d));

/* ---- Liên hệ giao máy khi khách gửi yêu cầu thuê ---- */
const oldBooking = (await guest('/customer/bookings')).data.find((b) => b.customer_note === 'test');
check('Yêu cầu không nhập số liên hệ thì lấy số trong hồ sơ', /^\d{9,15}$/.test(oldBooking?.contact_phone ?? ''), oldBooking?.contact_phone);
const freeNow = (await guest('/customer/catalog')).data;
const s2 = new Date(Date.now() + 60_000);
const bookingBody = (extra) => ({
  deviceId: freeNow[0].id, billingMode: 'MONTHLY', startAt: s2.toISOString(),
  endAt: new Date(s2.getTime() + 2 * 86_400_000).toISOString(), note: 'Giao máy tối nay', ...extra,
});
r = await guest('/customer/bookings', { method: 'POST', body: bookingBody({ contactPhone: '12ab', contactChannel: 'ZALO' }) });
check('Chặn số liên hệ sai khi gửi yêu cầu thuê', r.status === 400, r.data?.message);
r = await guest('/customer/bookings', { method: 'POST', body: bookingBody({ contactPhone: '0987 654 321', contactChannel: 'ZALO', handoverMethod: 'ULTRAVIEWER' }) });
check('Khách gửi yêu cầu thuê kèm số Zalo và cách nhận máy', r.status === 201, r.data?.code);
const withContact = (await admin('/service-desk/overview?limit=500')).data.bookings.rows.find((b) => b.code === r.data?.code);
check('Quầy thấy số Zalo và cách nhận máy của yêu cầu',
  withContact?.contact_phone === '0987654321' && withContact?.contact_channel === 'ZALO' && withContact?.handover_method === 'ULTRAVIEWER');
r = await admin(`/service-desk/bookings/${withContact?.id}/approve`, { method: 'POST', body: { quotedAmount: 300000 } });
const contactRental = (await admin('/rentals')).data.find((x) => x.code === r.data?.rentalCode);
check('Duyệt yêu cầu: đơn thuê giữ số Zalo và cách nhận máy',
  contactRental?.contact_phone === '0987654321' && contactRental?.handover_method === 'ULTRAVIEWER' && Boolean(contactRental?.customer_phone));

/* ---- Nạp ví qua chuyển khoản VietQR ---- */
r = await guest('/customer/topups');
check('Chưa khai báo tài khoản nhận: khách chưa nạp bằng QR được', r.status === 200 && r.data.bank.ready === false);
r = await guest('/customer/topups', { method: 'POST', body: { amount: 200000 } });
check('Chặn tạo mã nạp khi cửa hàng chưa bật', r.status === 409, r.data?.message);
check('Nhân viên không xem được tài khoản nhận tiền', (await staff('/topups/bank')).status === 403);
check('Nhân viên không đổi được tài khoản nhận tiền',
  (await staff('/topups/bank', { method: 'PUT', body: { enabled: true, bin: '970436', accountNo: '0123456789', accountName: 'X Y' } })).status === 403);
r = await admin('/topups/bank', { method: 'PUT', body: { enabled: true, bin: '970436', accountNo: '', accountName: '' } });
check('Chặn bật nạp QR khi thiếu số tài khoản', r.status === 400, r.data?.message);
r = await admin('/topups/bank', { method: 'PUT', body: { enabled: true, bin: '970436', accountNo: '0123 456 789', accountName: 'Thuê Máy Hub Demo' } });
check('Chủ khai báo tài khoản nhận (tên tự bỏ dấu, viết hoa)',
  r.status === 200 && r.data.settings.ready && r.data.settings.accountNo === '0123456789' && r.data.settings.accountName === 'THUE MAY HUB DEMO');
r = await guest('/customer/topups', { method: 'POST', body: { amount: 5000 } });
check('Chặn nạp dưới mức tối thiểu', r.status === 400, r.data?.message);
r = await guest('/customer/topups', { method: 'POST', body: { amount: 200000 } });
const topup = r.data ?? {};
const qr = String(topup.qr_payload ?? '');
check('Khách tạo mã VietQR nạp ví', r.status === 201 && /^NAP [A-Z2-9]{6}$/.test(topup.transfer_note) && String(topup.qr_svg).startsWith('<svg'), topup.transfer_note);
check('Chuỗi QR đúng chuẩn VietQR: ngân hàng, số tài khoản, số tiền, nội dung, CRC',
  qr.startsWith('000201010212') && qr.includes('0006970436') && qr.includes('01100123456789') && qr.includes('5406200000')
  && qr.includes(`08${String(topup.transfer_note?.length).padStart(2, '0')}${topup.transfer_note}`) && crc16(qr.slice(0, -4)) === qr.slice(-4));
r = await guest('/customer/topups', { method: 'POST', body: { amount: 100000 } });
check('Mỗi lúc chỉ một yêu cầu nạp đang chờ', r.status === 409, r.data?.message);
r = await guest(`/customer/topups/${topup.id}/paid`, { method: 'POST' });
check('Khách báo đã chuyển khoản', r.status === 200);
r = await admin('/topups');
const deskTopup = r.data.rows.find((t) => t.id === topup.id);
check('Chủ thấy yêu cầu nạp và việc khách đã báo chuyển', r.data.pending === 1 && Boolean(deskTopup?.customer_paid_at) && deskTopup?.transfer_note === topup.transfer_note);
check('Nhân viên không xác nhận được khoản nạp', (await staff(`/topups/${topup.id}/approve`, { method: 'POST', body: {} })).status === 403);
check('Khách không gọi được API xác nhận nạp', (await guest(`/topups/${topup.id}/approve`, { method: 'POST', body: {} })).status === 401);
const walletBefore = (await guest('/hub/wallet')).data.balance;
r = await admin(`/topups/${topup.id}/approve`, { method: 'POST', body: { amount: 200000, note: 'FT123' } });
check('Chủ xác nhận đã nhận tiền → cộng ví khách', r.status === 200 && r.data.walletBalance === walletBefore + 200000, `ví ${r.data?.walletBalance}`);
r = await admin(`/topups/${topup.id}/approve`, { method: 'POST', body: {} });
check('Không xác nhận một khoản nạp hai lần', r.status === 409, r.data?.message);
const walletAfter = (await guest('/hub/wallet')).data;
check('Lịch sử ví có dòng nạp chuyển khoản kèm nội dung',
  walletAfter.balance === walletBefore + 200000 && walletAfter.rows.some((w) => w.kind === 'DEPOSIT' && w.payment_method === 'BANK' && w.notes.includes(topup.transfer_note)));
check('Khách có thông báo đã nạp tiền', (await guest('/customer/notifications')).data.some((n) => n.kind === 'WALLET_TOPUP'));
r = await guest('/customer/topups', { method: 'POST', body: { amount: 300000 } });
const rejected = r.data ?? {};
r = await admin(`/topups/${rejected.id}/reject`, { method: 'POST', body: { adminNote: 'Chưa thấy tiền về' } });
const afterReject = (await guest('/customer/topups')).data.rows.find((t) => t.id === rejected.id);
check('Chủ báo không thấy tiền: ví không đổi, khách thấy lý do',
  r.status === 200 && afterReject?.status === 'REJECTED' && afterReject?.admin_note === 'Chưa thấy tiền về' && (await guest('/hub/wallet')).data.balance === walletBefore + 200000);
r = await guest('/customer/topups', { method: 'POST', body: { amount: 50000 } });
const cancelled = r.data ?? {};
r = await guest(`/customer/topups/${cancelled.id}/cancel`, { method: 'POST' });
check('Khách tự huỷ yêu cầu nạp', r.status === 200 && (await admin('/topups')).data.pending === 0);

console.log(failures ? `\n${failures} kiểm tra lỗi` : '\nTất cả kiểm tra đều đạt');
process.exit(failures ? 1 : 0);
