@echo off

set airtube="%~dp0..\..\index.js"
set youtube="https://www.youtube.com/watch?v=YE7VzlLtp-4"
set options=-v
set logfile="%~dpn0.log"

call node %airtube% %youtube% %options% >%logfile% 2>&1
