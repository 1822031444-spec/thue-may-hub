import { db, getWalletBalance, hashPassword, makeCode, makeId, nowIso, runTransaction, seedInitialAdmin, syncDeviceStatus } from './database.ts';

seedInitialAdmin();
const existing = db.prepare("SELECT COUNT(*) AS count FROM customers WHERE notes = 'Dữ liệu minh họa'").get() as { count: number };
if (existing.count > 0) {
  console.log('[seed] Dữ liệu minh họa đã tồn tại, không tạo thêm.');
  process.exit(0);
}

const admin = db.prepare('SELECT id FROM admins LIMIT 1').get() as { id: string };
const time = nowIso();
const customerId = makeId();
const accountId = makeId();
const pcId = makeId();
const phoneId = makeId();
const rentalId = makeId();
const customerCode = makeCode('KH');
const pcCode = makeCode('PC');
const phoneCode = makeCode('BP');
const rentalCode = makeCode('HD');

runTransaction(() => {
  db.prepare(`INSERT INTO customers
    (id, code, name, phone, email, company, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Dữ liệu minh họa', ?, ?)`)
    .run(customerId, customerCode, 'Khách hàng minh họa', '0900000000', 'demo@example.com', 'Studio Demo', time, time);
  db.prepare(`INSERT INTO customer_accounts
    (id, customer_id, email, password_hash, status, created_at, updated_at)
    VALUES (?, ?, 'demo@example.com', ?, 'ACTIVE', ?, ?)`)
    .run(accountId, customerId, hashPassword('Demo@12345'), time, time);
  db.prepare(`INSERT INTO devices
    (id, code, name, type, specs, ip_address, hourly_rate, monthly_rate, purchase_price, status, notes, created_at, updated_at)
    VALUES (?, ?, 'PC Render 01', 'PC', 'Ryzen 7 · RAM 32GB · RTX 4060', '10.10.20.101', 30000, 3200000, 22000000, 'AVAILABLE', 'Dữ liệu minh họa', ?, ?)`)
    .run(pcId, pcCode, time, time);
  db.prepare(`INSERT INTO devices
    (id, code, name, type, specs, ip_address, hourly_rate, monthly_rate, purchase_price, status, notes, created_at, updated_at)
    VALUES (?, ?, 'Boxphone 01', 'BOXPHONE', 'Android 13 · RAM 6GB · 128GB', '10.10.30.101', 10000, 900000, 3500000, 'AVAILABLE', 'Dữ liệu minh họa', ?, ?)`)
    .run(phoneId, phoneCode, time, time);

  const txId = makeId();
  db.prepare(`INSERT INTO financial_transactions
    (id, code, customer_id, kind, payment_method, cash_change, wallet_change, revenue_change, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, 'DEPOSIT', 'BANK', 5000000, 5000000, 0, 'Dữ liệu minh họa', ?, ?, ?)`)
    .run(txId, makeCode('GD'), customerId, admin.id, time, time);

  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  db.prepare(`INSERT INTO rentals
    (id, code, customer_id, device_id, start_at, end_at, base_amount, total_amount, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 3200000, 3200000, 'ACTIVE', 'Dữ liệu minh họa', ?, ?)`)
    .run(rentalId, rentalCode, customerId, pcId, time, end.toISOString(), time, time);
  syncDeviceStatus(pcId, 'ACTIVE');

  db.prepare(`INSERT INTO financial_transactions
    (id, code, customer_id, rental_id, kind, payment_method, cash_change, wallet_change, revenue_change, notes, created_by, occurred_at, created_at)
    VALUES (?, ?, ?, ?, 'RENTAL_PAYMENT', 'WALLET', 0, -3200000, 3200000, 'Dữ liệu minh họa', ?, ?, ?)`)
    .run(makeId(), makeCode('GD'), customerId, rentalId, admin.id, time, time);
});

console.log(`[seed] Đã tạo dữ liệu minh họa. Ví còn lại: ${getWalletBalance(customerId).toLocaleString('vi-VN')} đồng.`);
console.log('[seed] Cổng khách: demo@example.com / Demo@12345');
