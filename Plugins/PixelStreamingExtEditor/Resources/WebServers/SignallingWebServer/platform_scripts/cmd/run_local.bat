@Rem Copyright Epic Games, Inc. All Rights Reserved.

@echo off

@Rem Set script directory as working directory.
pushd "%~dp0"

@Rem Set node.js directory.
set LOCAL_NODE_DIRECTORY=%cd%\..\..\..\node

title Cirrus

@Rem Run setup to ensure we have node and cirrus installed.
call setup.bat %*

@Rem Move to cirrus directory.
pushd ..\..

@Rem Run node server and pass any argument along.
"%LOCAL_NODE_DIRECTORY%\node.exe" cirrus %*

@Rem Pop cirrus directory.
popd

@Rem Pop script directory.
popd

pause