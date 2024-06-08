@echo off

pushd "%~dp0"

set ROOT_DIRECTORY=%cd%

echo ---------------------------------
echo SignallingWebServer Clear Cache.
echo ---------------------------------

@Rem シグナリングサーバのキャッシュを削除
rmdir /s /q "%ROOT_DIRECTORY%\SignallingWebServer\platform_scripts\cmd\coturn"
rmdir /s /q "%ROOT_DIRECTORY%\SignallingWebServer\node_modules"
rmdir /s /q "%ROOT_DIRECTORY%\SignallingWebServer\logs"

echo ---------------------------------
echo SFU Clear Cache.
echo ---------------------------------

@Rem SFUサーバのキャッシュを削除
rmdir /s /q "%ROOT_DIRECTORY%\SFU\node_modules"

echo ---------------------------------
echo CloudRenderingJS Clear Cache.
echo ---------------------------------

@Rem CloudRenderingJS のキャッシュを削除
rmdir /s /q "%ROOT_DIRECTORY%\CloudRenderingJS\my-app\node_modules"

echo ---------------------------------
echo node.js Clear Cache.
echo ---------------------------------

@Rem node.js のキャッシュを削除
rmdir /s /q "%ROOT_DIRECTORY%\node"

echo ---------------------------------
echo Clear Cache Completed.
echo ---------------------------------
