@echo off
rem Double-click to download a Pinterest board's images.
cd /d "%~dp0"
python -m pip install --quiet --upgrade gallery-dl
python pin_grab.py %*
pause
