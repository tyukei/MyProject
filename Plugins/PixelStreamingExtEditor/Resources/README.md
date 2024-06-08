# Read me

この Read Me には、シングルプロセスの UE アプリと Web サーバー類を起動させる手順を記載しています。

## フォルダ構成

|フォルダ名|備考|
|:--|:--|
|RunScript|起動用バッチファイル格納フォルダ|
|WebServers|サーバーソースコード格納フォルダ|
|Windows|UE アプリ格納フォルダ|

## 起動手順

Webサーバー類、UE アプリの順に起動させるためのバッチファイルを実行させます。

## nodejs の設定

RunSS_SFU.bat を起動したときに、シグナリングサーバ、SFU サーバ、CloudRenderingJS で使用する nodejs を共有するように、統一フォルダにインストールするようにしました。

## Webサーバ類起動

RunScript フォルダにある RunSS_SFU.bat を実行する事で シグナリングサーバ、SFU、Web クライアントが起動して、Web ブラウザにログインページが表示されます。

```bat
RunSS_SFU.bat
```

### シグナリングサーバの起動

シグナリングサーバの設定は、コンフィグファイルでの指定と起動引数で行うことができます。

#### コンフィグファイルでの指定

```bat
start .\platform_scripts\cmd\node\npm run start -- --configFile %CURRENT_DIRECTORY%\configMap1.json
```

例: サンプルのコンフィグファイル

```json
{
    "UseHTTPS": false,
    "LogToFile": true,
    "LogVerbose": true,
    "EnableJWT": false,
    "PublicIp": "localhost",
    "HttpPort": 8080,
    "HttpsPort": 443,
    "StreamerPort": 8880,
    "SFUPort": 8890,
    "KeepAlive": 30000,
    "maxPlayerControllers": 50
}
```

#### 起動引数での指定

シグナリングサーバの起動は以下のコマンドで行うことができます。

```bat
start .\platform_scripts\cmd\node\npm run start -- --HttpPort=8080 --StreamerPort=8880 --SFUPort=8890
```

<b>起動引数の説明</b>

|引数|備考|
|:--|:--|
|HttpPort|Web クライアントからシグナリングサーバに接続するポート番号を設定します。|
|StreamerPort|UE クライアントからシグナリングサーバに接続するポート番号を設定します。<br>デフォルトから変更する場合には、UE アプリの起動引数に `-PixelStreamingURL=ws://localhost:{StreamerPort}` を追加してください。|
|SFUPort|SFU サーバからシグナリングサーバに接続するポート番号を設定します。|
|maxPlayerControllers|シグナリングサーバ側での参加人数の上限数を設定します。|

例: 複数のシグナリングサーバを起動する場合

```bat
set HTTP_PORT_00=8080
set HTTP_PORT_01=8081
set HTTP_PORT_02=8082
set HTTP_PORT_03=8083
set STREAMER_PORT_00=8880
set STREAMER_PORT_01=8881
set STREAMER_PORT_02=8882
set STREAMER_PORT_03=8883
set SFU_PORT_00=8890
set SFU_PORT_01=8891
set SFU_PORT_02=8892
set SFU_PORT_03=8893

call npm install

start npm run start -- --HttpPort=%HTTP_PORT_00% --StreamerPort=%STREAMER_PORT_00% --SFUPort=%SFU_PORT_00%
start npm run start -- --HttpPort=%HTTP_PORT_01% --StreamerPort=%STREAMER_PORT_01% --SFUPort=%SFU_PORT_01%
start npm run start -- --HttpPort=%HTTP_PORT_02% --StreamerPort=%STREAMER_PORT_02% --SFUPort=%SFU_PORT_02%
start npm run start -- --HttpPort=%HTTP_PORT_03% --StreamerPort=%STREAMER_PORT_03% --SFUPort=%SFU_PORT_03%
```

### CloudRenderingJS の起動

CloudRenderingJS から接続するシグナリングサーバは、起動引数にホストを追加することで行うことができます。

```bat
call run-app.bat localhost
```

例：IP アドレスが 192.168.0.123 の場合

```bat
call run-app.bat 192.168.0.123
```

複数のシグナリングサーバに接続する場合には、カンマ区切りで指定することで指定することができます。

```bat
call run-app.bat "localhost:8080,localhost:8081"
```

複数のシグナリングサーバを指定する場合は、ダブルクォーテーションで囲まないと認識されませんので、ご注意ください。

#### 直接実行する場合

bat ファイルを使用せずに、直接 npm run start で CloudRenderingJS を起動する場合には、以下のように実行します。

React に渡すパラメータとして、環境変数の `REACT_APP_SIGNALLING_SERVER_HOSTNAME` に設定します。

```bat
@Rem シグナリングサーバの hostname を設定します。
set REACT_APP_SIGNALLING_SERVER_HOSTNAME="localhost:8080,localhost:8081"

call npm run start
```

## UE アプリ起動

RunScript フォルダにある runApp.bat を実行する事で UE アプリが起動します。

```bat
runApp.bat
```

UE アプリ起動後、Web ブラウザに表示されているログインページをリロードすることで、UE アプリのカメラ情報が更新されてログインが出来るようになります。
