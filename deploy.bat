@echo off
rem Builds the site and publishes it to GitHub Pages (https://acruz97.github.io/me/).
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run deploy
echo.
if errorlevel 1 (echo Deploy FAILED - copy the error above and send it to Claude.) else (echo Deployed. Give GitHub Pages a minute or two, then refresh https://acruz97.github.io/me/)
pause
