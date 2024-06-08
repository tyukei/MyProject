@echo off

@Rem get current folder path.
set CURRENT_DIRECTORY=%~dp0

@Rem Set script directory as working directory.
pushd "%~dp0"

cd ..\WebServers

call setup_nodejs.bat

cd ..\WebServers\SignallingWebServer\platform_scripts\cmd

start run_local.bat

cd %CURRENT_DIRECTORY%
cd ..\WebServers\SFU\platform_scripts\cmd

start run.bat

cd %CURRENT_DIRECTORY%
cd ..\WebServers\CloudRenderingJS

start run-app.bat localhost
