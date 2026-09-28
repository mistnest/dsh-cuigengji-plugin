@echo off
setlocal
if not defined DSH_WORKSPACE for %%I in ("%~dp0..\..") do set "DSH_WORKSPACE=%%~fI"
cd /d "%DSH_WORKSPACE%\"
set "DSH_HOME=%DSH_WORKSPACE%\dsh-desktop\home"
set "DSH_DESKTOP_USER_DATA_DIR=%DSH_WORKSPACE%\dsh-desktop\electron-user-data"
set "CUIGENGJI_DATA_ROOT=%DSH_WORKSPACE%\dsh-desktop\cuigengji-data"
set "DSH_DESKTOP_PRIMARY_RUNTIME_DIR=%DSH_WORKSPACE%\dsh-upstream\apps\desktop\.desktop-build\targets\win-x64\runtime\primary-runtime"
set "DSH_DESKTOP_OPEN_DEVTOOLS=0"
set "ELECTRON_RUN_AS_NODE="
set "DSH_ELECTRON=%DSH_WORKSPACE%\dsh-upstream\apps\desktop\node_modules\electron\dist\electron.exe"
if not exist "%DSH_ELECTRON%" goto missing
if not exist "%DSH_DESKTOP_PRIMARY_RUNTIME_DIR%\runtime.json" goto missing
"%DSH_ELECTRON%" "--user-data-dir=%DSH_DESKTOP_USER_DATA_DIR%" "%DSH_WORKSPACE%\dsh-upstream\apps\desktop" >> "%DSH_WORKSPACE%\dsh-desktop\desktop-launch.log" 2>&1
if errorlevel 1 (
  echo Desktop failed. See dsh-desktop\desktop-launch.log
  pause
)
goto done
:missing
echo Desktop runtime is missing. Please rebuild the desktop application.
pause
:done
endlocal
