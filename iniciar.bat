@echo off
setlocal
set "PATH=%USERPROFILE%\node-portable;%PATH%"
cd /d "%~dp0"
echo Iniciando Clinica Odontologica Jacupiranga...
node server.js
pause
