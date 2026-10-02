@echo off
setlocal
if not defined DSH_DESKTOP_EXE (
  echo Set DSH_DESKTOP_EXE to your installed DeepSeek Harness executable, or use its desktop shortcut.
  exit /b 1
)
if not exist "%DSH_DESKTOP_EXE%" (
  echo Installed DeepSeek Harness not found. Check DSH_DESKTOP_EXE.
  exit /b 1
)
start "" "%DSH_DESKTOP_EXE%"
endlocal
