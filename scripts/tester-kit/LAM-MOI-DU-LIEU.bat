@echo off
setlocal
chcp 65001 >nul
title Thue May Hub - Lam moi du lieu

echo Thao tac nay XOA moi thu ban da lam khi test va tao lai du lieu mau ban dau.
echo Hay DONG cua so "Thue May Hub - Demo" truoc khi tiep tuc.
echo.
choice /c YN /m "Ban chac chan muon lam moi du lieu"
if errorlevel 2 goto het

set "DATABASE_PATH=%~dp0data\hub-demo.db"
set "NODE_NO_WARNINGS=1"
cd /d "%~dp0"
"%~dp0app\node.exe" "%~dp0app\seed.mjs" --reset
if errorlevel 1 (
  echo.
  echo [LOI] Khong lam moi duoc. Co the ung dung van dang chay: dong cua so "Thue May Hub - Demo" roi chay lai file nay.
  goto het
)
echo.
echo Xong. Chay CHAY-DEMO.bat de mo lai ung dung.

:het
echo.
pause
