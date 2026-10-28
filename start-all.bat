@echo off
title BluePay Launcher
echo ==================================================
echo           Starting BluePay Services
echo ==================================================

:: Check if MongoDB is already listening on 27017
powershell -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 1 }"
if %errorlevel% neq 0 (
    echo [0/3] Starting Local MongoDB Server on Port 27017...
    start "Local MongoDB" "C:\Users\Admin\mongodb\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "C:\Users\Admin\mongodb\data\db" --bind_ip 127.0.0.1 --port 27017
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Local MongoDB is already running on port 27017.
)

echo [1/3] Starting Backend API (Port 1977)...
start "BluePay Backend API (Port 1977)" cmd /k "cd /d %~dp0apis && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Admin Dashboard (Port 5174)...
start "BluePay Admin Dashboard (Port 5174)" cmd /k "cd /d %~dp0admin && npm run dev"

echo [3/3] Starting Frontend (Port 5173)...
start "BluePay Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==================================================
echo All services are running:
echo  * Local MongoDB:     mongodb://127.0.0.1:27017/bluePay
echo  * Backend API:       http://localhost:1977
echo  * Frontend Portal:   http://localhost:5173
echo  * Admin Dashboard:   http://localhost:5174
echo ==================================================
pause
