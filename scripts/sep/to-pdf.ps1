# Xuat ban PDF cho Bao cao tien do va Huong dan thuyet trinh bang chinh Microsoft Word,
# de chu tieng Viet, bang va hinh SVG giong het ban Word. PDF co muc luc (bookmark)
# theo cac tieu de.
#
# Chay: npm run sep:pdf   (npm run sep cung tu goi script nay o buoc cuoi)
# Them file khac: npm run sep:pdf -- "duong\dan\file.docx"

param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\..\SEP_Nhom11_ThueMayHub'
if (-not $Files -or $Files.Count -eq 0) {
  $Files = @(
    (Join-Path $root '00_BAO-CAO-TIEN-DO.docx'),
    (Join-Path $root '00_BAO-CAO-HOAN-CHINH.docx'),
    (Join-Path $root '00_HUONG-DAN-THUYET-TRINH.docx')
  ) | Where-Object { Test-Path -LiteralPath $_ }
}

$word = $null
try {
  $word = New-Object -ComObject Word.Application
} catch {
  Write-Host 'Khong tim thay Microsoft Word tren may nay nen chua xuat duoc PDF.'
  exit 1
}

try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  foreach ($file in $Files) {
    $docx = (Resolve-Path $file).Path
    $pdf = [System.IO.Path]::ChangeExtension($docx, '.pdf')
    # Word đôi khi không ghi đè được PDF đang tồn tại dù file không có thuộc tính
    # ReadOnly. Xuất sang file tạm cùng thư mục rồi thay thế sau khi đóng document.
    $tmpPdf = Join-Path ([System.IO.Path]::GetDirectoryName($pdf)) (
      ([System.IO.Path]::GetFileNameWithoutExtension($pdf)) + '.tmp-' + [Guid]::NewGuid().ToString('N') + '.pdf'
    )
    # Mo chi doc nhu truoc. Tai lieu co muc luc (field TOC) thi mo lai de ghi: Word
    # dien muc luc, so trang roi luu vao chinh file .docx, de ban Word va PDF giong nhau.
    $doc = $word.Documents.Open($docx, $false, $true)
    if ($doc.TablesOfContents.Count -gt 0) {
      $doc.Close($false)
      $doc = $word.Documents.Open($docx, $false, $false)
      foreach ($t in $doc.TablesOfContents) { $t.Update() }
      $doc.Save()
    }
    try {
      # Truyen so truc tiep va chi 11 tham so dau (3 tham so cuoi Word tu lay mac dinh:
      # DocStructureTags=true, BitmapMissingFonts=true, UseISO19005_1=false). Goi du 14
      # tham so bang bien lam PowerShell 5.1 bao OutOfMemoryException khi dung call site.
      # 17 = PDF, 0 = toi uu de in, 0 = ca tai lieu, 0 = noi dung, 1 = bookmark theo tieu de.
      $doc.ExportAsFixedFormat([string]$tmpPdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)
      $pages = $doc.ComputeStatistics(2)
    } finally {
      $doc.Close($false)
    }
    try {
      Move-Item -LiteralPath $tmpPdf -Destination $pdf -Force
      Write-Host ("  PDF  {0}  ({1} trang)" -f [System.IO.Path]::GetFileName($pdf), $pages)
    } finally {
      if (Test-Path -LiteralPath $tmpPdf) { Remove-Item -LiteralPath $tmpPdf -Force }
    }
  }
} finally {
  if ($word) { $word.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
