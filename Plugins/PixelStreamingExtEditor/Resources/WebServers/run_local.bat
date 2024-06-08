@echo off

pushd "%~dp0"

set WEBSERVERS_DIRECTORY=%cd%

call setup_node.bat


echo ------------------------------------------------------------
echo Execute SignallingWebServer.
echo ------------------------------------------------------------

pushd "%WEBSERVERS_DIRECTORY%\SignallingWebServer\platform_scripts\cmd"

start run_local.bat

echo ------------------------------------------------------------
echo Execute SFU Server.
echo ------------------------------------------------------------

pushd "%WEBSERVERS_DIRECTORY%\SFU\platform_scripts\cmd"

start run.bat

echo ------------------------------------------------------------
echo Execute CloudRenderingJS.
echo ------------------------------------------------------------

pushd "%WEBSERVERS_DIRECTORY%\CloudRenderingJS"

start run-app.bat localhost
