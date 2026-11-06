@echo off
rem Publish: double-click, or run  publish.cmd what-changed
rem pulls phone edits, builds, updates fonts, commits, pushes (see tools\publish.mjs)
cd /d "%~dp0"
"%USERPROFILE%\tools\node\node.exe" tools\publish.mjs %*
pause
