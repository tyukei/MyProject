
import { CRWebsocket } from '../src/websocket';
import WS from "jest-websocket-mock";

test('ユニットテスト', async () => {
  const server = new WS('ws://localhost:1234');

  let ws = new CRWebsocket();
  ws.onConfig = (config) => {
    console.log(config)
  }
  ws.connect('ws://localhost:1234');

  await server.connected;

  let json = {
    type: 'config',
    message: 'message'
  }

  server.send(JSON.stringify(json));

  server.close();

  WS.clean();
});
