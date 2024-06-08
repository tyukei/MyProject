@echo off

pushd "%~dp0"

@Rem nodejs フォルダの設定を行います。
set LOCAL_NODE_DIRECTORY=%cd%\..\node

@Rem nodejs ディレクトリを一時的に PATH へ設定します。
set PATH=%~dp0../node;%PATH%

@Rem 文字コードを UTF8 に変更します。
chcp 65001

@Rem nodejs のセットアップを行います。Note: nodejs 作業ディレクトリ統一化のためインストール処理をスキップします。
@Rem call setup_node.bat
popd

@Rem my-app のインストール処理を行います。
pushd "%~dp0my-app"
call "%LOCAL_NODE_DIRECTORY%\node.exe" "%LOCAL_NODE_DIRECTORY%\node_modules\npm\bin\npm-cli.js" install --no-save

@Rem 第一引数: シグナリングサーバーURL
@Rem 第二引数: CloudRenderingJS の起動ポート
echo [0]=%0
echo [1]=%1
echo [2]=%2
echo [3]=%3
echo [4]=%4

@Rem シグナリングサーバの hostname を設定します。
set REACT_APP_SIGNALLING_SERVER_HOSTNAME=%1

echo ---------------------------------
echo %~dp0my-app
echo ---------------------------------

if "%~2" == "" (
  set PORT=3000
) else (
  set PORT=%2
)

call set PORT=%PORT% && "%LOCAL_NODE_DIRECTORY%\node.exe" "%~dp0my-app\node_modules\react-scripts\bin\react-scripts.js" start

popd

pause
