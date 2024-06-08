
// 複数のシグナリングサーバを保持
// それらのシグナリングサーバに紐づく sceneId のリストを保持
export const ServerOptions = [
  {
    uri: 'ws://localhost',
    sceneIds: ['0']
  },
  {
    uri: 'ws://localhost:8000',
    sceneIds: ['1']
  },
  {
    uri: 'ws://localhost:8080',
    sceneIds: ['2']
  }
];

// 環境変数から接続先のシグナリングサーバのリストを取得いします。
export function getSignallingServerUrls() {
  if (!process.env.REACT_APP_SIGNALLING_SERVER_HOSTNAME) {
    return [
      {
        apiUrl: 'http://' + window.location.hostname + '/sceneList',
        wsUrl: 'ws://' + window.location.hostname
      }
    ];
  }

  let results = [];

  const hostnames = process.env.REACT_APP_SIGNALLING_SERVER_HOSTNAME.replaceAll("\"", "").split(',');
  for (let hostname of hostnames) {
    // localhost が指定されていた場合には、アドレスバーに入力されたホスト名に変換します。
    hostname = hostname.replaceAll("localhost", window.location.hostname);
    results.push({
      apiUrl: 'http://' + hostname + '/sceneList',
      wsUrl: 'ws://' + hostname
    });
  }
  return results;
}

