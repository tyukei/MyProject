@echo off

@Rem 文字コードを UTF8 に変更します。
chcp 65001

rem EXEファイルが存在するfolderに移動します。
pushd ..\Windows

rem 起動する EXE ファイルを検索して、START_UP_EXE に設定します。
FOR %%i IN (*.exe) DO (
  set START_UP_EXE=%%i
  GOTO :START
)

:START
@echo on
rem アプリを起動します。
%START_UP_EXE% ^
  -PixelStreamingEncoderTargetBitrate=2000000 ^
  -PixelStreamingEncoderMinQP=-1 ^
  -PixelStreamingEncoderMaxQP=30 ^
  -PixelStreamingEncoderKeyframeInterval=10 ^
  -PixelStreamingWebRTCFps=30 ^
  -PixelStreamingSendPlayerIdAsInteger=false ^
  -PixelStreamingURL=%1 ^
  -SceneId=%2 ^
  -AudioMixer ^
  -ResX=1280 ^
  -ResY=720 ^
  -ForceRes ^
  -WINDOWED

exit
