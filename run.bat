@echo off
title Distributed Server Health Monitoring and Failure Detection System
cls
echo =====================================================================
echo  Distributed Server Health Monitoring and Failure Detection System
echo =====================================================================
echo.

echo Choose your preferred runtime environment:
echo [1] Java Spring Boot Backend (Full Enterprise Stack with MySQL/H2)
echo [2] Instant Preview Server (Node.js - Zero Setup Required)
echo [3] Open MySQL Schema in Notepad
echo [4] Exit
echo.
set /p choice="Enter option [1, 2, 3, or 4]: "

if "%choice%"=="1" goto run_spring
if "%choice%"=="2" goto run_node
if "%choice%"=="3" goto open_schema
if "%choice%"=="4" goto exit_script

:run_spring
echo.
echo Checking for Java environment...
where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Java 17+ was not found in your PATH.
    echo Please install OpenJDK 17 or 21 and Maven, or choose Option 2 for Instant Preview.
    pause
    goto exit_script
)
echo Starting Spring Boot application with Maven...
echo Access URL: http://localhost:8080
echo Admin Login: admin / admin123
start "" http://localhost:8080
call mvn spring-boot:run
pause
goto exit_script

:run_node
echo.
echo Starting Instant Preview Server...
echo Access URL: http://localhost:8080
echo Admin Login: admin / admin123
start "" http://localhost:8080
node preview-server.js
pause
goto exit_script

:open_schema
notepad database\schema.sql
goto exit_script

:exit_script
exit /b 0
