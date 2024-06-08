# サンプルの実行手順

サンプルの動作手順を説明します。

## 動作環境

以下のバージョンの nodejs と npm で動作を確認しています。

- nodeJS v20.11.1
- npm v10.2.4
- yarn v1.22.22
※npm, yarn 等、コマンドが見つからない場合は、上記ツールがインストールされているかを確認してください。

## サンプルの初期化

```console
yarn install
```

## サンプルの実行

```console
yarn start
```

HTTPS で起動したい場合には、以下のコマンドを使用します。

```console
HTTPS=true yarn start
```

## シグナリングサーバの変更

App.js で設定している以下の option を修正することで、接続先のシグナリングサーバを変更することができます。

```javascript
// 複数のシグナリングサーバを保持
// それらのシグナリングサーバに紐づく sceneId のリストを保持
this.options = [
  {
    uri: 'ws://192.168.2.37',
    sceneIds: ['104']
  },
  {
    uri: 'ws://192.168.2.37:8000',
    sceneIds: ['105']
  },
  {
    uri: 'ws://192.168.2.37:8080',
    sceneIds: ['106']
  },
];
```

## cloud-rendering-lib の開発

my-app を使用して、開発を行う場合に、cloud-rendering-lib を修正した時に、即座に修正が反映されません。

そこで、開発を行う場合には、以下のファイルを修正します。

my-app/package.json を開き、以下の箇所を削除します。

```json
    "cloudrendering": "file:../cloud-rendering-lib",
```

以下のコマンドを実行します。

```console
yarn add link:../cloud-rendering-lib
```

my-app/package.json が以下の行が追加されます。

```json
    "cloudrendering": "link:../cloud-rendering-lib",
```

これで、ライブラリへのシンボリックリンクになり、修正が即座に反映されるようになります。
