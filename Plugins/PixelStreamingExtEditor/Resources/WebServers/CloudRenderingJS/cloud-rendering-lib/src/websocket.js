'use strict';

/**
 * Websocket が接続されているステートを定義します。
 * 
 * @private
 */
const WS_OPEN_STATE = 1;

/**
 * Websocket の接続管理を行います。
 * 
 * @private
 */
export class CRWebsocket {
  constructor () {
    this.ws = undefined;
    this.url = undefined;
    this.closeFlag = false;
  }

  onOpen() {
    console.log('Not implements.');
  }

  onConfig(msg) {
    console.log('Not implements.', msg);
  }

  onPlayerId(msg) {
    console.log('Not implements.', msg);
  }

  onPlayerCount(msg) {
    console.log('Not implements.', msg);
  }

  onStreamerList(msg) {
    console.log('Not implements.', msg);
  }

  onStreamerReady(msg) {
    console.log('Not implements.', msg);
  }
  
  onWebRtcOffer(msg) {
    console.log('Not implements.', msg);
  }

  onWebRtcAnswer(msg) {
    console.log('Not implements.', msg);
  }

  onWebRtcIce(msg) {
    console.log('Not implements.', msg);
  }

  onWebRtcDatachannel(msg) {
    console.log('Not implements.', msg);
  }

  onWebRtcDatachannelFailed(msg) {
    console.log('Not implements.', msg);
  }

  onWebRtcDisconnectScene(msg) {
    console.log('Not implements.', msg);
  }

  onWSError(event) {
    console.log('Not implements.', event);
  }

  onWSClose() {
    console.log('Not implements.');
  }

  connect(connectionUrl, attemptStreamReconnection = true) {
    console.log(`Creating a websocket connection to: ${connectionUrl}`);

    if (this.ws) {
      console.log(`Already connected: ${connectionUrl}`);
      return;
    }

    this.url = connectionUrl;

    this.ws = new WebSocket(connectionUrl);
    this.ws.attemptStreamReconnection = attemptStreamReconnection;
    this.ws.onopen = (event) => {
      // 既に close されている場合には、再度 close を呼び出します。
      if (this.closeFlag) {
        this.close();
        return;
      }

      if (typeof(this.onOpen) == 'function') {
        this.onOpen(event);
      }
    };
    this.ws.onmessage = (event) => {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.log(`JSON.parse error.`, err);
        return;
      }

      try {
        if (msg.type === 'config') {
          console.log("%c[Inbound SS (config)]", "background: lightblue; color: black", msg);
          this.onConfig(msg);
        } else if (msg.type === 'playerId') {
          console.log("%c[Inbound SS (playerId)]", "background: lightblue; color: black", msg);
          this.onPlayerId(msg);
        } else if (msg.type === 'streamerList') {
          console.log("%c[Inbound SS (streamerList)]", "background: lightblue; color: black", msg);
          this.onStreamerList(msg);
        } else if (msg.type === 'streamerReady') {
          console.log("%c[Inbound SS (streamerReady)]", "background: lightblue; color: black", msg);
          this.onStreamerReady(msg);
        } else if (msg.type === 'playerCount') {
          console.log("%c[Inbound SS (playerCount)]", "background: lightblue; color: black", msg);
          this.onPlayerCount(msg);
        } else if (msg.type === 'offer') {
          console.log("%c[Inbound SS (offer)]", "background: lightblue; color: black", msg);
          this.onWebRtcOffer(msg);
        } else if (msg.type === 'answer') {
          console.log("%c[Inbound SS (answer)]", "background: lightblue; color: black", msg);
          this.onWebRtcAnswer(msg);
        } else if (msg.type === 'iceCandidate') {
          console.log("%c[Inbound SS (iceCandidate)]", "background: lightblue; color: black", msg);
          this.onWebRtcIce(msg);
        } else if (msg.type === 'peerDataChannels') {
          console.log("%c[Inbound SS (peerDataChannels)]", "background: lightblue; color: black", msg);
          this.onWebRtcDatachannel(msg);
        } else if (msg.type === 'streamerDataChannelsFailed') {
          console.log("%c[Inbound SS (streamerDataChannelsFailed)]", "background: lightblue; color: black", msg);
          this.onWebRtcDatachannelFailed(msg);
        } else if (msg.type === 'disconnectScene') {
          console.log("%c[Inbound SS (disconnectScene)]", "background: lightblue; color: black", msg);
          this.onWebRtcDisconnectScene(msg);
        } else if(msg.type === 'warning' && msg.warning) {
          console.warn(msg.warning);
        } else {
          console.error("Invalid SS message type", msg);
        }
      } catch (err) {
        console.log(`WS message error: ${msg}`, err);
      }
    };

    this.ws.onerror = (event) => {
      console.log(`WS error: ${JSON.stringify(event)}`);
      if (typeof(this.onWSError) == 'function') {
        this.onWSError(event);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`WS close: ${JSON.stringify(event)}`);
      if (typeof(this.onWSClose) == 'function') {
        this.onWSClose(event);
      }
      this.ws = null;
    };

    return true;
  }

  isConnected() {
    return this.ws && this.ws.readyState === WS_OPEN_STATE;
  }

  send(msg) {
    if (this.isConnected()) {
      this.ws.send(msg);
    } else {
      console.log('Websocket is not connect.');
    }
  }

  sendUserInfo(userInfo) {
    let data = {
      type: 'userInfo'
    };

    Object.keys(userInfo).forEach((key) => {
      data[key] = userInfo[key];
    });
    
    this.send(JSON.stringify(data));
  }

  close(code = undefined) {
    this.closeFlag = true;

    if (this.ws) {
      // websocket に接続される前に close が要求された場合には
      // this.closeFlag を true にして、Websocket::onOpen 
      // のイベントで websocket を close するようにします。
      if (this.ws.readyState === WS_OPEN_STATE) {
        this.ws.close(code);
        this.ws = null;
      }
    }

    this.onOpen = undefined;
    this.onConfig = undefined;
    this.onPlayerId = undefined;
    this.onPlayerCount = undefined;
    this.onStreamerList = undefined;
    this.onWebRtcOffer = undefined;
    this.onWebRtcAnswer = undefined;
    this.onWebRtcIce = undefined;
    this.onWebRtcDatachannel = undefined;
    this.onWebRtcDatachannelFailed = undefined;
    this.onWebRtcDisconnectScene = undefined;
    this.onWSError = undefined;
    this.onWSClose = undefined;
  }
}
