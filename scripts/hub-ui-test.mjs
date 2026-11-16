/**
 * Chạy thử giao diện ThueMayHub-FE trên trình duyệt thật (Microsoft Edge có sẵn trên
 * Windows): đăng nhập bốn vai trò, bấm qua các màn chính và các thao tác chính,
 * chụp ảnh vào `ThueMayHub-FE/test-results/`. Báo lỗi nếu có lỗi JavaScript, lỗi tải
 * tài nguyên hay một thao tác không ra kết quả mong đợi.
 *
 * Cần bản hoàn chỉnh đang chạy và dữ liệu mẫu sạch (`npm run hub:reset` trước khi chạy).
 *
 *   npm run test:hub-ui                       (bản phát triển, cổng 5274)
 *   HUB_URL=http://127.0.0.1:8789/ ...        (bản build)
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fe = join(dirname(fileURLToPath(import.meta.url)), '..', 'ThueMayHub-FE');
const require = createRequire(join(fe, 'package.json'));
const { chromium } = require('playwright');

const OUT = join(fe, 'test-results');
mkdirSync(OUT, { recursive: true });
const URL = process.env.HUB_URL || 'http://127.0.0.1:5274/';
const problems = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function session(name) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${name}] console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().waitFor();
  return { context, page };
}

async function login(page, identity) {
  await page.getByPlaceholder('Nhập tài khoản').fill(identity);
  await page.getByPlaceholder('Nhập mật khẩu').fill('demo123');
  await page.locator('form button[type=submit], form button:not([type])').last().click();
}

/** Chờ toast có nội dung khớp; không thấy thì ghi lỗi chứ không dừng cả bài. */
async function expectToast(page, who, pattern, what) {
  await page.getByText(pattern).first().waitFor({ timeout: 8000 }).catch(() => problems.push(`[${who}] không thấy kết quả: ${what}`));
}

const nav = (page, label) => page.locator('aside nav button', { hasText: label }).click();
const shot = (page, file) => page.screenshot({ path: `${OUT}/${file}.png`, fullPage: false });

/* Quản trị */
{
  const { context, page } = await session('admin');
  await shot(page, '1-dang-nhap');
  await login(page, 'admin');
  await page.getByText('Tổng quan vận hành').waitFor();
  await page.waitForTimeout(500);
  await shot(page, '2-admin-tong-quan');

  await nav(page, 'Đơn thuê');
  await page.getByText('Tất cả đơn thuê').waitFor();
  await shot(page, '3-admin-don-thue');
  await page.locator('tr', { hasText: 'TMH-1023' }).getByRole('button', { name: 'Duyệt' }).click();
  await page.getByText('Duyệt yêu cầu thuê').waitFor();
  await shot(page, '4-admin-duyet');
  await page.locator('form').getByRole('button', { name: 'Duyệt' }).click();
  await expectToast(page, 'admin', /Đã duyệt, tạo đơn/, 'duyệt yêu cầu thuê');

  await page.locator('tr', { hasText: 'GH-1001' }).getByRole('button', { name: 'Duyệt' }).click();
  await page.getByText('Duyệt yêu cầu gia hạn').waitFor();
  await shot(page, '13-admin-duyet-gia-han');
  await page.locator('form').getByRole('button', { name: 'Duyệt gia hạn' }).click();
  await expectToast(page, 'admin', /Đã duyệt gia hạn/, 'duyệt gia hạn');

  await page.locator('tr', { hasText: 'TMH-1028' }).getByRole('button', { name: 'Gia hạn' }).click();
  await page.getByText('Gia hạn đơn TMH-1028').waitFor();
  await shot(page, '14-admin-gia-han');
  await page.locator('form').getByRole('button', { name: 'Gia hạn' }).click();
  await expectToast(page, 'admin', /Đã gia hạn tới/, 'gia hạn tại quầy');

  await nav(page, 'Máy');
  await page.getByText('Danh sách thiết bị').waitFor();
  await page.locator('tr', { hasText: 'PC-003' }).getByRole('button', { name: 'Sửa' }).click();
  await page.locator('input[name=location]').fill('Tầng 1 · Khu D');
  await page.locator('form').getByRole('button', { name: 'Lưu' }).click();
  await expectToast(page, 'admin', 'Đã lưu thông tin máy.', 'sửa máy');
  await shot(page, '15-admin-may');

  await nav(page, 'Khách hàng');
  await page.locator('tr', { hasText: 'KH-002' }).getByRole('button', { name: 'Chi tiết' }).click();
  await page.getByText('Lịch sử ví').waitFor();
  await page.waitForTimeout(400);
  await shot(page, '16-admin-chi-tiet-khach');
  await page.getByRole('dialog').getByLabel('Đóng', { exact: true }).click();

  await nav(page, 'Ví khách');
  await page.getByText('Quản lý số dư ví khách').waitFor();
  await page.locator('tr', { hasText: 'KH-001' }).getByRole('button', { name: 'Nạp ví' }).click();
  await page.locator('input[name=amount]').fill('200000');
  await page.locator('form').getByRole('button', { name: 'Lưu' }).click();
  await expectToast(page, 'admin', /Đã nạp/, 'nạp ví');
  await shot(page, '5-admin-vi');

  await nav(page, 'Hỗ trợ khách');
  await page.getByText('Yêu cầu hỗ trợ của khách').waitFor();
  await page.locator('tr', { hasText: 'HT-1001' }).getByRole('button', { name: 'Mở' }).click();
  await page.getByPlaceholder('Trả lời khách…').fill('Cửa hàng đã kiểm tra máy, anh/chị thử lại giúp em nhé.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expectToast(page, 'admin', 'Đã gửi phản hồi.', 'trả lời hỗ trợ');
  await page.waitForTimeout(400);
  await shot(page, '17-admin-ho-tro');
  await page.getByRole('dialog').getByLabel('Đóng', { exact: true }).click();

  await nav(page, 'Linh kiện');
  await page.getByText('Kho linh kiện dự phòng').waitFor();
  await shot(page, '6-admin-linh-kien');
  await nav(page, 'Báo cáo');
  await page.waitForTimeout(300);
  await shot(page, '7-admin-bao-cao');

  await nav(page, 'Cài đặt');
  await page.getByRole('heading', { name: 'Thông tin cửa hàng' }).waitFor();
  await shot(page, '18-admin-cai-dat');
  for (const [tab, marker] of [['Khoá mạng', 'Lệnh khoá'], ['Sao lưu', 'Các bản sao lưu'], ['Telegram', 'Token của bot'], ['Nhật ký thao tác', 'Ai đã làm gì']]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByText(marker).first().waitFor({ timeout: 8000 }).catch(() => problems.push(`[admin] Cài đặt: không mở được tab ${tab}`));
  }
  await shot(page, '19-admin-nhat-ky');
  await context.close();
}

/* Nhân viên */
{
  const { context, page } = await session('staff');
  await login(page, 'phat');
  await page.getByText('Khu vực nhân viên').waitFor();
  const menu = await page.locator('aside nav button').allInnerTexts();
  if (menu.some((t) => /Ví khách|Nhân viên|Báo cáo|Cài đặt/.test(t))) problems.push(`[staff] menu lộ trang quản trị: ${menu.join(' | ')}`);
  if (!menu.some((t) => /Hỗ trợ khách/.test(t))) problems.push('[staff] thiếu trang Hỗ trợ khách');
  await nav(page, 'Thanh toán');
  await page.getByText('Lịch sử giao dịch thu tiền').waitFor();
  await shot(page, '8-nhanvien-thanh-toan');
  await page.getByRole('button', { name: 'Thu tiền' }).first().click();
  await page.locator('input[name=amount]').fill('100000');
  await page.locator('form').getByRole('button', { name: 'Lưu' }).click();
  await expectToast(page, 'staff', 'Đã ghi nhận thu tiền.', 'thu tiền');
  await context.close();
}

/* Khách */
{
  const { context, page } = await session('customer');
  await login(page, '0902345678');
  await page.getByText(/Xin chào/).waitFor();
  await shot(page, '9-khach-may-trong');
  const request = page.getByRole('button', { name: 'Gửi yêu cầu thuê' }).first();
  if (await request.count()) {
    await request.click();
    // Số liên hệ giao máy điền sẵn từ hồ sơ; khách đổi sang số Zalo khác và chọn cách nhận máy.
    const phoneBox = page.getByLabel('Số điện thoại / Zalo liên hệ');
    const prefilled = await phoneBox.inputValue();
    if (prefilled !== '0902345678') problems.push(`[customer] ô liên hệ không điền sẵn số trong hồ sơ: "${prefilled}"`);
    await phoneBox.fill('0987 654 321');
    await page.getByLabel('Liên hệ qua').selectOption('ZALO');
    await page.getByLabel('Cách nhận máy').selectOption('ULTRAVIEWER');
    await shot(page, '22-khach-gui-yeu-cau');
    await page.locator('form').getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await page.getByText('Đơn thuê của bạn').waitFor({ timeout: 8000 }).catch(() => problems.push('[customer] không chuyển sang tab đơn'));
    await page.waitForTimeout(400);
    await shot(page, '10-khach-don');
  } else problems.push('[customer] không có máy trống để gửi yêu cầu');

  await page.locator('tr', { hasText: 'TMH-1028' }).getByRole('button', { name: 'Trả bằng ví' }).click();
  await page.getByRole('button', { name: 'Xác nhận trả' }).click();
  await expectToast(page, 'customer', /Đã trả .* từ ví/, 'trả bằng ví');
  await page.locator('tr', { hasText: 'TMH-1028' }).getByRole('button', { name: 'Xin gia hạn' }).click();
  await page.getByRole('button', { name: 'Gửi yêu cầu gia hạn' }).click();
  await expectToast(page, 'customer', /Đã gửi yêu cầu gia hạn/, 'xin gia hạn');

  await page.getByRole('button', { name: 'Ví tiền' }).click();
  await page.getByText('Lịch sử ví').waitFor();
  await page.waitForTimeout(400);
  await shot(page, '11-khach-vi');

  await page.getByRole('button', { name: /^Hỗ trợ/ }).click();
  await page.getByText('Yêu cầu đã gửi').waitFor();
  await page.getByRole('button', { name: 'Xem' }).first().click();
  // Tìm trong hội thoại: dòng ticket phía sau cũng hiện tin cuối nên getByText trần sẽ khớp hai chỗ.
  await page.getByRole('dialog').getByText('Cửa hàng đã kiểm tra máy').waitFor({ timeout: 8000 }).catch(() => problems.push('[customer] không thấy phản hồi của cửa hàng'));
  await shot(page, '20-khach-ho-tro');
  await page.getByRole('dialog').getByLabel('Đóng', { exact: true }).click();

  await page.getByRole('button', { name: 'Hồ sơ' }).click();
  await page.getByText('Thông tin cá nhân').waitFor();
  await shot(page, '21-khach-ho-so');
  await context.close();
}

/*
 * Tin nhắn hỗ trợ hai chiều: bên đang mở hội thoại thấy tin mới mà không phải đóng mở
 * lại; bên không mở hội thoại thì nhận thông báo. Bên gửi dùng API để bài chạy nhanh.
 */
{
  const a = await session('chat-admin');
  await login(a.page, 'admin');
  await a.page.getByText('Tổng quan vận hành').waitFor();
  const c = await session('chat-customer');
  await login(c.page, '0902345678');
  await c.page.getByText(/Xin chào/).waitFor();
  const api = (path) => new globalThis.URL(`api/${path}`, URL).href;
  const ticket = (await (await a.page.request.get(api('service-desk/tickets'))).json()).find((t) => t.code === 'HT-1001');

  // Khách đang mở hội thoại, cửa hàng trả lời.
  await c.page.getByRole('button', { name: /^Hỗ trợ/ }).click();
  await c.page.locator('li', { hasText: 'HT-1001' }).getByRole('button', { name: 'Xem' }).click();
  await c.page.getByRole('dialog').getByText('Cửa hàng đã kiểm tra máy').waitFor();
  await a.page.request.post(api(`service-desk/tickets/${ticket.id}/messages`), { data: { body: 'Cửa hàng nhắn trực tiếp lần 1' } });
  await c.page.getByRole('dialog').getByText('Cửa hàng nhắn trực tiếp lần 1').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[chat] khách đang mở hội thoại nhưng không thấy tin mới của cửa hàng'));

  // Cửa hàng đang mở hội thoại, khách trả lời trên giao diện.
  await nav(a.page, 'Hỗ trợ khách');
  await a.page.getByRole('button', { name: /^Tất cả/ }).click();
  await a.page.locator('tr', { hasText: 'HT-1001' }).getByRole('button', { name: 'Mở' }).click();
  await c.page.getByPlaceholder('Nhắn thêm cho cửa hàng…').fill('Khách trả lời trực tiếp lần 2');
  await c.page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await a.page.getByRole('dialog').getByText('Khách trả lời trực tiếp lần 2').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[chat] quầy đang mở hội thoại nhưng không thấy tin mới của khách'));

  // Cửa hàng đóng hội thoại, khách nhắn tiếp: cửa hàng phải có thông báo.
  await a.page.getByRole('dialog').getByLabel('Đóng', { exact: true }).click();
  await c.page.getByPlaceholder('Nhắn thêm cho cửa hàng…').fill('Khách nhắn thêm lần 3');
  await c.page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await a.page.getByText(/vừa nhắn HT-1001: Khách nhắn thêm lần 3/).waitFor({ timeout: 10000 })
    .catch(() => problems.push('[chat] quầy không nhận thông báo khi khách nhắn'));

  // Khách đóng hội thoại, cửa hàng trả lời: khách phải có thông báo và chuông tăng.
  await c.page.getByRole('dialog').getByLabel('Đóng', { exact: true }).click();
  await a.page.request.post(api(`service-desk/tickets/${ticket.id}/messages`), { data: { body: 'Cửa hàng trả lời lần 4' } });
  await c.page.getByText(/Cửa hàng vừa trả lời HT-1001: Cửa hàng trả lời lần 4/).waitFor({ timeout: 10000 })
    .catch(() => problems.push('[chat] khách không nhận thông báo khi cửa hàng trả lời'));
  await c.page.getByRole('button', { name: /Thông báo \([1-9]\d* chưa đọc\)/ }).waitFor({ timeout: 5000 })
    .catch(() => problems.push('[chat] chuông thông báo của khách không tăng'));
  await a.context.close();
  await c.context.close();
}

/*
 * Liên hệ giao máy và nạp ví qua VietQR: quầy thấy số Zalo khách để lại; chủ khai báo
 * tài khoản nhận; khách tạo mã QR và báo đã chuyển; chủ nhận thông báo, xác nhận; ví khách tăng.
 */
{
  const a = await session('qr-admin');
  await login(a.page, 'admin');
  await a.page.getByText('Tổng quan vận hành').waitFor();
  await nav(a.page, 'Đơn thuê');
  await a.page.getByText('Tất cả đơn thuê').waitFor();
  await a.page.getByText('Zalo 0987654321 · UltraViewer').first().waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-admin] đơn thuê không hiện số Zalo và cách nhận máy khách để lại'));
  await shot(a.page, '23-admin-lien-he-giao-may');

  // Chưa khai báo tài khoản nhận: khách được báo là chưa bật, chủ được nhắc ở trang Ví khách.
  const c = await session('qr-customer');
  await login(c.page, '0902345678');
  await c.page.getByText(/Xin chào/).waitFor();
  await c.page.getByRole('button', { name: 'Ví tiền' }).click();
  await c.page.getByText('Cửa hàng chưa bật nạp ví bằng mã QR').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-customer] chưa khai báo tài khoản nhận mà khách không được báo'));
  await nav(a.page, 'Ví khách');
  await a.page.getByText('Khách chưa thấy mã QR để chuyển khoản').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-admin] trang Ví khách không nhắc khai báo tài khoản nhận'));
  await shot(a.page, '28-admin-nhac-khai-bao');
  await a.page.getByRole('button', { name: 'Khai báo tài khoản nhận' }).click();
  await a.page.getByText('Nhận chuyển khoản (VietQR)').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-admin] nút "Khai báo tài khoản nhận" không mở đúng mục cài đặt'));
  await a.page.getByLabel('Cho khách nạp ví bằng chuyển khoản qua mã QR').check();
  await a.page.getByRole('combobox', { name: /^Ngân hàng/ }).selectOption('970436');
  await a.page.getByLabel('Số tài khoản').fill('0123456789');
  await a.page.getByLabel('Tên chủ tài khoản').fill('Thuê Máy Hub Demo');
  await a.page.getByRole('button', { name: 'Lưu tài khoản nhận' }).click();
  await expectToast(a.page, 'qr-admin', 'Đã lưu. Khách đã thấy nút nạp ví bằng mã QR.', 'lưu tài khoản nhận');
  await a.page.getByRole('button', { name: 'Xem mã QR mẫu' }).click();
  await a.page.getByRole('img', { name: 'Mã QR mẫu của tài khoản nhận' }).waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-admin] không hiện mã QR mẫu'));
  await shot(a.page, '24-admin-nhan-chuyen-khoan');

  // Mở lại tab Ví tiền: lúc này khách phải thấy phần tạo mã QR.
  await c.page.getByRole('button', { name: 'Hồ sơ' }).click();
  await c.page.getByRole('button', { name: 'Ví tiền' }).click();
  const balance = c.page.locator('article', { hasText: 'Số dư ví khả dụng' }).locator('p').nth(1);
  await balance.waitFor();
  const before = Number((await balance.innerText()).replace(/\D/g, ''));
  await c.page.getByRole('button', { name: '200.000đ', exact: true }).click();
  await c.page.getByRole('button', { name: 'Tạo mã QR chuyển khoản' }).click();
  await c.page.getByRole('img', { name: /Mã VietQR chuyển 200\.000đ/ }).waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-customer] không hiện mã VietQR'));
  const note = (await c.page.getByText(/^NAP [A-Z2-9]{6}$/).first().innerText().catch(() => '')).trim();
  if (!note) problems.push('[qr-customer] không thấy nội dung chuyển khoản');
  await shot(c.page, '25-khach-ma-qr');
  await c.page.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();
  await c.page.getByText('Chờ cửa hàng xác nhận').waitFor({ timeout: 8000 })
    .catch(() => problems.push('[qr-customer] bấm "Tôi đã chuyển khoản" mà không đổi trạng thái'));

  // Quầy đang mở app thì vài giây sau có thông báo, không phải tải lại trang.
  await a.page.getByText(/báo đã chuyển 200\.000đ/).first().waitFor({ timeout: 10000 })
    .catch(() => problems.push('[qr-admin] không nhận thông báo khi khách báo đã chuyển khoản'));
  await nav(a.page, 'Ví khách');
  await a.page.locator('tr', { hasText: note || 'NAP' }).getByRole('button', { name: 'Đã nhận tiền' }).click();
  await a.page.locator('form').getByRole('button', { name: 'Cộng vào ví' }).click();
  await expectToast(a.page, 'qr-admin', /Đã xác nhận, cộng 200\.000đ/, 'xác nhận khoản nạp');
  await shot(a.page, '26-admin-xac-nhan-nap');

  await c.page.getByText(/Cửa hàng đã xác nhận: \+200\.000đ vào ví/).waitFor({ timeout: 10000 })
    .catch(() => problems.push('[qr-customer] khách không thấy thông báo đã cộng tiền'));
  await c.page.waitForFunction(
    (want) => [...document.querySelectorAll('article')].some((el) => el.textContent.includes('Số dư ví khả dụng')
      && Number(el.querySelectorAll('p')[1]?.textContent.replace(/\D/g, '')) === want),
    before + 200000, { timeout: 8000 },
  ).catch(() => problems.push(`[qr-customer] số dư không tăng 200.000đ (trước: ${before})`));
  await shot(c.page, '27-khach-da-nap');
  await a.context.close();
  await c.context.close();
}

/* Khách mới đăng ký */
{
  const { context, page } = await session('register');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByPlaceholder('0901234567').fill('0977000111');
  await page.getByPlaceholder('email@example.com').fill('khachmoi@email.com');
  await page.getByPlaceholder('Nhập mật khẩu').fill('abc12345');
  await page.getByPlaceholder('Nhập lại mật khẩu').fill('abc12345');
  await page.getByRole('button', { name: 'Tạo tài khoản khách' }).click();
  await page.getByText('Hoàn thiện thông tin').waitFor();
  await shot(page, '12-ho-so');
  await context.close();
}

await browser.close();
console.log(problems.length ? `LỖI:\n${problems.join('\n')}` : 'Không có lỗi giao diện hay console.');
console.log(`Ảnh chụp: ${OUT}`);
process.exit(problems.length ? 1 : 0);
