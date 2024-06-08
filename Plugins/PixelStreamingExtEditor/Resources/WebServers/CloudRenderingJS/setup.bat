@echo off

pushd "%~dp0"

set ROOT_DIRECTORY=%cd%

@Rem nodejs フォルダの設定を行います。
set LOCAL_NODE=%cd%\..\node\node.exe
set LOCAL_NPM=%cd%\..\node\node_modules\npm\bin\npm-cli.js

@Rem nodejs ディレクトリを一時的に PATH へ設定します。
set PATH=%~dp0../node;%PATH%

@Rem 文字コードを UTF8 に変更します。
chcp 65001

@Rem nodejs のセットアップを行います。Note: nodejs 作業ディレクトリ統一化のためインストール処理をスキップします。
@Rem call setup_node.bat
popd

@Rem my-app のインストール処理を行います。
pushd "%ROOT_DIRECTORY%\my-app"
call "%LOCAL_NODE%" "%LOCAL_NPM%" install --no-save
