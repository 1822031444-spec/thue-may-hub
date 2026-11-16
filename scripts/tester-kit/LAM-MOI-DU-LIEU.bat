@echo off
setlocal
chcp 65001 >nul
title Thue May Hub - Lam moi du lieu

echo Thao tac nay XOA moi thu ban da lam khi test va tao lai du lieu mau ban dau.
echo Khong can dong cua so ung dung: lam moi xong chi can tai lai trang (F5).
echo.
choice /c YN /m "Ban chac chan muon lam moi du lieu"
if errorlevel 2 goto het

set "DATABASE_PATH=%~dp0data\hub-demo.db"
set "NODE_NO_WARNINGS=1"
cd /d "%~dp0"
"%~dp0app\node.exe" "%~dp0app\seed.mjs" --reset
if errorlevel 1 (
  echo.
  echo [LOI] Khong lam moi duoc. Dong cua so "Thue May Hub - Demo" roi chay lai file nay.
  echo Van loi thi chup man hinh cua so nay gui cho nhom.
  goto het
)
echo.
echo  ============================================================
echo   XONG: du lieu da ve nhu luc moi mo.
echo   - Ung dung dang mo: tai lai trang trong trinh duyet (F5) roi dang nhap lai.
echo   - Ung dung da tat: chay CHAY-DEMO.bat de mo lai.
echo  ============================================================

:het
echo.
pause
