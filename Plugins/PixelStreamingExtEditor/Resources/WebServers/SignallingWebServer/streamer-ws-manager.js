const { compareSync } = require('bcryptjs');
const logging = require('./modules/logging.js');
const WebSocket = require('ws');

const DEBUG_LOG = 0;

function logIncoming(sourceName, msgType, msg) {
	if (DEBUG_LOG == 1) {
		console.logColor(logging.Blue, "\x1b[37m-> %s\x1b[34m: %s", sourceName, msg);
	} else if (DEBUG_LOG == 2) {
		console.logColor(logging.Blue, "\x1b[37m-> %s\x1b[34m: %s", sourceName, msgType);
	}
}

function logOutgoing(destName, msgType, msg) {
	if (DEBUG_LOG == 1) {
		console.logColor(logging.Green, "\x1b[37m%s <-\x1b[32m: %s", destName, msg);
	} else if (DEBUG_LOG == 2) {
		console.logColor(logging.Green, "\x1b[37m%s <-\x1b[32m: %s", destName, msgType);
	}
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////


let StreamerSocketClient = function(server, ws) {
  // カメラモード.
  this.cameraMode = undefined;
  // BP_SceneCapture の sceneId.
  this.streamerId = undefined;
  // 三人称カメラに紐づけられている PlayerId.
  this.playerId = 0;
  this.server = server;
  this.websocket = ws;
  this.websocket.on('message', this.onMessage.bind(this));
  this.websocket.on('close', this.onClose.bind(this));
  this.websocket.on('error', this.onError.bind(this));  
  this.onOffer = function(msg) {};
  this.onAnswer = function(msg) {};
  this.onIceCandidate = function(msg) {};
  this.onDisconnectPlayer = function(msg) {};
  this.onDisconnectScene = function(msg) {};
  this.onDisconnected = () => {
    this.server.onDisconnectionInternal(this);
  };
  this.onStreamerDataChannelsFailed = function(msg) {};
  this.onEndPointId = function(msg) {};
};

StreamerSocketClient.prototype.send = function(msg) {
  // 送られてきたメッセージが文字列ではない場合には
  // JSON.stringify で文字列に変換します。
  if (typeof(msg) != 'string') {
    msg = JSON.stringify(msg);
  }
  this.websocket.send(msg);
};

StreamerSocketClient.prototype.isConnected = function() {
  return this.websocket != null  && this.websocket.readyState == 1;
};

StreamerSocketClient.prototype.onClose = function(code, reason) {
  console.error(`streamer[id=${this.streamerId}] disconnected: ${code} - ${reason}`);
  this.onDisconnected();
};

StreamerSocketClient.prototype.onError = function(error) {
  console.error(`streamer[id=${this.streamerId}] connection error: ${error}`);
  this.onDisconnected();
  try {
    this.websocket.close(1006 /* abnormal closure */, error);
  } catch(err) {
    console.error(`ERROR: ws.on error: ${err.message}`);
  }
};

StreamerSocketClient.prototype.onMessage = function(msgRaw) {
  var msg;
  try {
    msg = JSON.parse(msgRaw);
  } catch(err) {
    console.error(`cannot parse Streamer message: ${msgRaw}\nError: ${err}`);
    this.websocket.close(1008, 'Cannot parse json.');
    return;
  }

  try {
    // just send pings back to sender
    if (msg.type == 'ping') {
      this.websocket.send(JSON.stringify({ type: "pong", time: msg.time}));
      return;
    }

    logIncoming("Streamer", msg.type, msgRaw);

    if (msg.type == 'offer') {
      msg.sceneId = this.streamerId;
      this.onOffer(msg);
    } else if (msg.type == 'answer') {
      msg.sceneId = this.streamerId;
      this.onAnswer(msg);
    } else if (msg.type == 'iceCandidate') {
      msg.sceneId = this.streamerId;
      this.onIceCandidate(msg);
    } else if (msg.type == 'disconnectPlayer') {
      msg.sceneId = this.streamerId;
      this.onDisconnectPlayer(msg);
    } else if (msg.type == 'disconnectScene') {
      msg.sceneId = this.streamerId;
      this.onDisconnectScene(msg);
    } else if (msg.type == 'streamerDataChannelsFailed') {
      console.log(`[streamer] recv streamerDataChannelsFailed playerId: ${msg.playerId}, sceneId: ${msg.sceneId}, sendStreamId: ${msg.sendStreamId}, recvStreamId: ${msg.recvStreamId}`);
      const streamerDataChannelsFailed = {
        'type': 'streamerDataChannelsFailed',
        'sceneId': msg.sceneId,
        'playerId': msg.playerId
      };
      this.onStreamerDataChannelsFailed(streamerDataChannelsFailed);
    } else if (msg.type == 'endpointId') {
      // PlayerId と SceneId を紐づけます。
      this.cameraMode = msg.cameraMode;
      this.streamerId = msg.id;
      this.playerId = msg.playerId;
      this.server.addStreamer(msg.id, this);
      this.onEndPointId(msg);
    } else {
      console.error(`unsupported Streamer message type: ${msg.type}`);
    }
  } catch(err) {
    console.error(`ERROR: ws.on message error: ${err.message}`);
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////


let StreamerServerSocket = function(port) {
  this.streamers = new Map();
  this.streamerServer = new WebSocket.Server({ port: port, backlog: 1 });
  this.streamerServer.on('connection',this.onConnectionInternal.bind(this));
  this.onConnected = function(streamer) {};
  this.onDisconnected = function(streamer) {};
};

StreamerServerSocket.prototype.showStreamerList = function() {
  console.log('----------------------------------------');
  for (let id of this.streamers.keys()) {
    const streamer = this.streamers.get(id);
    console.log(`cameraMode=${streamer.cameraMode} id=${streamer.streamerId} playerId=${streamer.playerId}`);
  }
  console.log('----------------------------------------');
}

StreamerServerSocket.prototype.getStreamers = function() {
  return this.streamers;
}

StreamerServerSocket.prototype.getStreamerIds = function() {
  const ids = [];
  for (let id of this.streamers.keys()) {
    ids.push(id);
  }
  return ids;
}

StreamerServerSocket.prototype.getStreamer = function(id) {
  return this.streamers.get(id);
}

StreamerServerSocket.prototype.addStreamer = function(id, streamer) {
  this.streamers.set(id, streamer);
  this.showStreamerList();
}

StreamerServerSocket.prototype.isConnected = function() {
  return this.streamers.size > 0;
}

StreamerServerSocket.prototype.sendSfuConnected = function() {
  this.sendAll({
    type: "sfuConnected",
  });
};

StreamerServerSocket.prototype.sendSfuDisconnected = function() {
  this.sendAll({
    type: "sfuDisconnected",
  });
};

StreamerServerSocket.prototype.sendAll = function(msg) {
  const rawMsg = JSON.stringify(msg);
  for (let id of this.streamers.keys()) {
    this.streamers.get(id).send(rawMsg);
  }
};

StreamerServerSocket.prototype.sendToStreamer = function(streamerId, msg) {
  const rawMsg = JSON.stringify(msg);
  const streamer = this.streamers.get(streamerId);
  if (streamer) {
    streamer.send(rawMsg);
  } else {
    console.log(`Not found the streamer. streamerId=${streamerId}`);
  }
};

StreamerServerSocket.prototype.onConnectionInternal = function(ws, req) {
  console.logColor(logging.Green, `Streamer connected: ${req.connection.remoteAddress}`);

  let streamer = new StreamerSocketClient(this, ws);
  this.onConnected(streamer);
}

StreamerServerSocket.prototype.onDisconnectionInternal = function(streamer) {
  let streamerId = streamer.streamerId;
  if (streamerId) {
    this.streamers.delete(streamerId);
  }
  this.onDisconnected(streamer);
};

exports.StreamerServerSocket = StreamerServerSocket;
