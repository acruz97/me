@echo off
rem Starts the site's dev server on port 5180 and opens it in Microsoft Edge.
rem --host also makes it reachable from your phone on the same Wi-Fi: use the
rem "Network:" address Vite prints below (for example http://192.168.1.20:5180/me/).
cd /d "%~dp0"
if not exist node_modules call npm install
start "" cmd /c "timeout /t 5 /nobreak >nul & start msedge http://localhost:5180/me/"
call npm run dev -- --port 5180 --strictPort --host
