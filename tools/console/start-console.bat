@echo off
rem Starts the Apotheosis DM console and opens it in your browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing for the first time...
  call npm install --no-audit --no-fund || goto :fail
)
start "" http://127.0.0.1:7777
node --env-file-if-exists=.env server.js
goto :eof
:fail
echo Install failed. Is Node.js 22 installed? https://nodejs.org
pause
