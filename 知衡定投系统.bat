@echo off
cd /d D:\豆包量化工具
echo ============================================
echo   知衡·基金定投系统（真实数据版）
echo   正在启动，浏览器将自动打开 http://localhost:3000
echo ============================================
start "" http://localhost:3000
.venv\Scripts\python.exe webapp.py
pause
