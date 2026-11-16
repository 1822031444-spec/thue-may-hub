/**
 * Kiểm tra nội dung file CSV xuất ra.
 *
 * Hai lỗi ở đây chỉ lộ khi mở file bằng Excel, không lộ trong app: dấu phẩy
 * trong tên nhà cung cấp làm lệch cột, và thiếu BOM thì tiếng Việt ra chữ hỏng.
 */

import { buildCsv } from '../src/lib/csv.ts';

const failures = [];
function check(label, ok, detail = '') {
  if (ok) console.log(`  OK   ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}

const csv = buildCsv(
  ['Mã', 'Nhà cung cấp', 'Ghi chú', 'Số tiền'],
  [
    ['CP-1', 'Công ty A, chi nhánh 2', 'Bình thường', '500000'],
    ['CP-2', 'Cửa hàng "Số Một"', 'Có dấu nháy', '250000'],
    ['CP-3', '', 'Ô trống', '0'],
    ['CP-4', 'Xuống\ndòng', 'Có ký tự xuống dòng', '100'],
  ],
);

const lines = csv.split('\r\n');

check('Bat dau bang BOM cho Excel doc dung tieng Viet', csv.charCodeAt(0) === 0xfeff,
  `ky tu dau = U+${csv.charCodeAt(0).toString(16).toUpperCase()}`);

check('Giu nguyen dau tieng Viet', csv.includes('Nhà cung cấp'));

check('Dau phay trong o khong lam lech cot',
  lines[1] === '"CP-1","Công ty A, chi nhánh 2","Bình thường","500000"',
  lines[1]);

check('Dau nhay kep duoc nhan doi',
  lines[2] === '"CP-2","Cửa hàng ""Số Một""","Có dấu nháy","250000"',
  lines[2]);

check('O trong van giu du so cot',
  lines[3] === '"CP-3","","Ô trống","0"', lines[3]);

// Ô có xuống dòng nằm trong ngoặc kép nên vẫn là một ô, nhưng nó tự tách dòng
// khi split('\r\n')? Không — xuống dòng trong dữ liệu là \n, không phải \r\n.
check('Ky tu xuong dong trong o nam gon trong ngoac kep',
  lines[4] === '"CP-4","Xuống\ndòng","Có ký tự xuống dòng","100"',
  JSON.stringify(lines[4]));

check('Dung xuong dong kieu Windows giua cac dong', csv.includes('\r\n'));

const headerCells = lines[0].split('","').length;
check('Dong tieu de dung so cot', headerCells === 4, `${headerCells} cot`);

console.log(`\n${failures.length === 0 ? 'Result: PASS' : `Result: FAIL (${failures.length} loi)`}`);
process.exit(failures.length === 0 ? 0 : 1);
