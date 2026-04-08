@echo off
setlocal
echo 🚀 INICIANDO ATUALIZACAO DO ANTIGRAVITY MED...
echo.

:: Mudar para o diretório do projeto (caso não esteja nele)
cd /d "%~dp0"

:: 1. Adicionar arquivos
echo 📂 Reunindo arquivos novos...
git add .

:: 2. Criar commit com data e hora
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%
echo 📝 Registrando evolucao em %timestamp%...
git commit -m "Evolucao Antigravity Med - %timestamp%"

:: 3. Enviar para o GitHub
echo ☁️ Enviando para o GitHub (Vercel atualizara em seguida)...
git push origin main

echo.
echo ✅ SUCESSO! Seu site ja esta sendo atualizado.
echo.
pause
