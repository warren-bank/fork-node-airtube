@echo off

set airtube="%~dp0..\..\index.js"
set youtube="https://www.youtube.com/watch?v=YE7VzlLtp-4"
set options=-t 30

call node %airtube% %youtube% %options%

echo.
pause
