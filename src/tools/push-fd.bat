@echo off
chcp 65001 >nul
rem 推送这一屏：双击起台子，顺手把浏览器开到 http://127.0.0.1:8792/
rem 这一台里量、提交、打包、重建集成分支那四道全要靠 git 说话。
rem 双击起来用的是系统路径，里面不一定有 git —— 找不到就先在几个常见位置里认一遍，
rem 认得到就临时接进这一窗口的路径（不改系统设置、不动注册表），认不到就顶出来告诉你，别让你对着假数点按钮。
cd /d "%~dp0..\_build"
where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 node，推送这一屏要有 Node.js 才起得来
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  for %%D in ("%ProgramFiles%\Git\cmd" "%ProgramFiles(x86)%\Git\cmd" "%LocalAppData%\Programs\Git\cmd" "%USERPROFILE%\.qoder-cn\bin\git\cmd") do (
    if exist "%%~D\git.exe" set "PATH=%%~D;%PATH%"
  )
)
where git >nul 2>nul
if errorlevel 1 (
  echo 提醒：这一台找不到 git。那一屏会顶出红字，量与提交那四颗都不亮。
  echo 办法：装一次 Git for Windows，或在本来就用得到 git 的那个终端里跑这一句：node push-ui.mjs
  echo.
)
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8792/"
node push-ui.mjs
