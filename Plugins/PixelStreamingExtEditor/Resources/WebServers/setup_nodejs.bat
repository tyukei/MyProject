@Rem Copyright Epic Games, Inc. All Rights Reserved.

@echo off

@Rem Set script location as working directory for commands.
pushd "%~dp0"

@Rem Name and version of node that we are downloading
SET NodeVersion=v20.11.1
SET NodeName=node-%NodeVersion%-win-x64
SET CurrentVersion=%NodeVersion%

@Rem バージョンチェックを行い、バージョンが違う場合には削除して新規にインストールを行う。
if exist node\ (
  for /f "usebackq delims=" %%A in (`node\node.exe -v`) do SET CurrentVersion=%%A
)

if not %CurrentVersion%==%NodeVersion% (
  rd /S /Q node\
)

@Rem Look for a node directory next to this script
if exist node\ (
  echo Node directory found...skipping install.
) else (
  echo Node directory not found...beginning NodeJS download for Windows.

  @Rem Download nodejs and follow redirects.
  curl -L -o ./node.zip "https://nodejs.org/dist/%NodeVersion%/%NodeName%.zip"

  @Rem Unarchive the .zip
  tar -xf node.zip

  @Rem Rename the extracted, versioned, directory that contains the NodeJS binaries to simply "node".
  ren "%NodeName%\" "node"

  @Rem Delete the downloaded node.zip
  del node.zip
)

@Rem Print node version
echo Node version: & node\node.exe -v
echo Npm version: & node\npm -v

@Rem Pop working directory
popd
