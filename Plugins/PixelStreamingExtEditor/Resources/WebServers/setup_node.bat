@echo off

pushd "%~dp0"

set ROOT_DIRECTORY=%cd%

echo ------------------------------------------------------------
echo Install node.js.
echo ------------------------------------------------------------

call setup_nodejs.bat

echo ------------------------------------------------------------
echo Initialize SignallingWebServer.
echo ------------------------------------------------------------

pushd "%ROOT_DIRECTORY%\SignallingWebServer\platform_scripts\cmd"

call setup.bat


echo ------------------------------------------------------------
echo Initialize SFU Server.
echo ------------------------------------------------------------

pushd "%ROOT_DIRECTORY%\SFU\platform_scripts\cmd"

call setup.bat


echo ------------------------------------------------------------
echo Initialize CloudRenderingJS.
echo ------------------------------------------------------------

pushd "%ROOT_DIRECTORY%\CloudRenderingJS"

call setup.bat
