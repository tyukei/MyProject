# Read Me

## フォルダ構成

|フォルダ名|備考|
|:--|:--|
|cloud-rendering-lib|PixelStreaming拡張版プラグイン接続用ライブラリ|
|my-app|サンプルアプリ|

各フォルダにある README.md に起動方法は記載してあります。

## ドキュメント生成手順

cloud-rendering-lib のドキュメントを作成するコマンドになります。

### jsdoc インストール

ドキュメントの作成には jsdoc を使用しますので、以下のコマンドでインストールを行います。

```console
npm install -g jsdoc
```

### ドキュメント生成

以下のコマンドで、docs フォルダにドキュメントを作成します。

```console
jsdoc -d CloudRenderingJS-Docs cloud-rendering-lib/src
```
