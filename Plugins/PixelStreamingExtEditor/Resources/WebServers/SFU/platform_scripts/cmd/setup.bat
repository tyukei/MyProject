@Rem Copyright Epic Games, Inc. All Rights Reserved.

@echo off

@Rem Set script location as working directory for commands.
pushd "%~dp0"

@Rem Set node.js directory.
set LOCAL_NODE=%cd%\..\..\..\node\node.exe
set LOCAL_NPM=%cd%\..\..\..\node\node_modules\npm\bin\npm-cli.js

@Rem Ensure we have NodeJs available for calling.
@Rem Note: Skip the installation process for nodejs working directory unification.
@Rem call setup_node.bat

@Rem Move to sfu_server.js directory and install its package.json
pushd %~dp0\..\..\
call "%LOCAL_NODE%" "%LOCAL_NPM%" install --no-save
popd

@Rem Pop working directory
popd