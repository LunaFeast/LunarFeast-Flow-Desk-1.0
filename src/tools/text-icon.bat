@echo off
chcp 65001 >nul
rem 文字与图标这一屏：双击起台子，顺手把浏览器开到 http://127.0.0.1:8792/
rem 这一台只管两样：改界面上的句子、改图标。顶上那一行「站在哪条支、有没有没提交的」才要靠 git 说话。
rem 双击起来用的是系统路径，里面不一定有 git —— 找不到就先在几个常见位置里认一遍，
rem 认得到就临时接进这一窗口的路径（不改系统设置、不动注册表）；认不到就顶出来告诉你 —— 那两样照旧能使，只是那一行要说「问不出」。
cd /d "%~dp0..\_build"
where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 node，文字与图标这一屏要有 Node.js 才起得来
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
  echo 提醒：这一台找不到 git。顶上那一行会写「盘上问不出」，不会装成都提交完了；改句子、改图标这两样照旧能使。
  echo 办法：装一次 Git for Windows，或在本来就用得到 git 的那个终端里跑这一句：node text-icon.mjs
  echo.
)
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8792/"
node text-icon.mjs
