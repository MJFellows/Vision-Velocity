@echo off
REM Vision Velocity — clean reinstall after the Next.js 16 upgrade.
REM Run this from inside "VV App\04-development\" (or double-click it there).

setlocal

echo.
echo === Backend ===
cd backend
if exist node_modules (
  echo Deleting old node_modules...
  rmdir /s /q node_modules
)
if exist package-lock.json (
  echo Deleting old package-lock.json...
  del /q package-lock.json
)
echo Running npm install...
call npm install
cd ..

echo.
echo === Frontend ===
cd frontend
if exist node_modules (
  echo Deleting old node_modules...
  rmdir /s /q node_modules
)
if exist package-lock.json (
  echo Deleting old package-lock.json...
  del /q package-lock.json
)
echo Running npm install...
call npm install
cd ..

echo.
echo Done. Both projects are now installed against Next.js 16.
pause
