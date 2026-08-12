@echo off
setlocal
set "PATH=%USERPROFILE%\node-portable;%PATH%"
cd /d "%~dp0"
echo Iniciando Clinica Odontologica Jacupiranga...
if not exist ".env.local" (
  echo.
  echo ERRO: falta o arquivo .env.local com a conexao do banco Postgres.
  echo Veja o README.md, secao "Rodar localmente".
  echo.
  pause
  exit /b 1
)
node --env-file=.env.local server.js
pause
