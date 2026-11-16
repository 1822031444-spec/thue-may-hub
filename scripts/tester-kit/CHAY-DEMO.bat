@echo off
setlocal
chcp 65001 >nul
title Thue May Hub - Demo

rem Chay ban demo: tao du lieu mau (lan dau) roi mo server o http://localhost:8790.
rem Moi thu nam trong thu muc nay, khong can cai Node hay npm.

if not defined TMH_PORT set "TMH_PORT=8790"
set "PORT=%TMH_PORT%"
set "HOST=127.0.0.1"
set "DATABASE_PATH=%~dp0data\hub-demo.db"
set "STATIC_DIR=%~dp0app\web"
set "NODE_NO_WARNINGS=1"
cd /d "%~dp0"

echo Dang chuan bi du lieu...
"%~dp0app\node.exe" "%~dp0app\seed.mjs"
if errorlevel 1 goto loi

echo.
echo  ============================================================
echo   Thue May Hub dang chay tai:  http://localhost:%TMH_PORT%
echo   GIU CUA SO NAY MO trong luc test. Dong cua so = tat ung dung.
echo  ============================================================
echo.
if not defined TMH_NO_BROWSER start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:%TMH_PORT%"
"%~dp0app\node.exe" "%~dp0app\server.cjs"
if errorlevel 1 goto loi
goto het

:loi
echo.
echo [LOI] Ung dung khong chay duoc. Xem dong bao loi o phia tren.
echo  - Thay chu EADDRINUSE: ung dung dang chay o mot cua so khac, hay dong cua so do roi chay lai.
echo  - Truong hop khac: chup man hinh cua so nay gui cho nhom.

:het
echo.
pause
