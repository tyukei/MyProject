@echo off

pushd "%~dp0"

set ROOT_DIRECTORY=%cd%

@Rem HTML公開用のフォルダへのパスを定義
set SIGNALLING_PUBLIC_DIRECTORY="%ROOT_DIRECTORY%\..\SignallingWebServer\Public"

@Rem nodejs のセットアップを行います。
call setup_node.bat
popd

echo ------------------------------------------------------------
echo Build my-app.
echo ------------------------------------------------------------

@Rem my-app のビルド処理を行います。
pushd "%ROOT_DIRECTORY%\my-app"
call ..\node\npm run build

@Rem ビルド結果をシグナリングサーバのフォルダに移動
move /y build %SIGNALLING_PUBLIC_DIRECTORY%\app

echo ------------------------------------------------------------
echo Build is completed.
echo ------------------------------------------------------------
