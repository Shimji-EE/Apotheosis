@echo off
rem Apotheosis Icon Studio: the BG3 Icon Generator in its own window, with every icon exported under
rem the mod name "Apotheosis" published to the site (copied in, committed and pushed) automatically.
rem Name each icon by where it goes, e.g. "Species Snow Elf", "Class Blood Hunter", "Power Frost Ward".
rem See README.md next to this file.
setlocal
set "HERE=%~dp0"
set "PORT=7788"
set "URL=http://127.0.0.1:%PORT%/"
set "GEN="
for %%G in ("%HERE%..\bg3-icon-generator" "%HERE%..\..\BG3-Icon-Generator" "%HERE%..\..\BG3_Icon_Generator") do (
  if not defined GEN if exist "%%~G\Start.bat" set "GEN=%%~fG"
)
if not defined GEN (
  echo Could not find the BG3 Icon Generator next to the Apotheosis folder or in tools\bg3-icon-generator.
  pause
  exit /b 1
)

echo Apotheosis Icon Studio
echo Starting the editor (the first start sets itself up, which takes a few minutes)...
start "Icon Studio editor - keep open" /min cmd /c ""%GEN%\Start.bat" --port %PORT% --no-browser"

powershell -NoProfile -Command "for($i=0;$i -lt 1200;$i++){try{Invoke-WebRequest '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0}catch{Start-Sleep 1}}; exit 1"
if errorlevel 1 (
  echo The editor did not start. Look at the "Icon Studio editor" window for the reason.
  pause
  exit /b 1
)

start "Icon Studio publisher - keep open" /min "%GEN%\.runtime\env\Scripts\python.exe" "%HERE%studio.py" --gen "%GEN%" --port %PORT%

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL% --window-size=1600,1000
) else if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL% --window-size=1600,1000
) else (
  start "" %URL%
)
exit /b 0
