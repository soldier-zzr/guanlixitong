@echo off
cd /d %~dp0
set PORT=3021
echo Starting 珠峰学员管理系统 on port %PORT%...
call npm run start -- --port %PORT%
