
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


let SfuSocketClient = function(server, ws) {
  this.server = server;
  this.websocket = ws;
  this.websocket.on('message', this.onMessage.bind(this));
  this.websocket.on('close', this.onClose.bind(this));
  this.websocket.on('error', this.onError.bind(this));
  this.onOffer = function(msg) {};
  this.onAnswer = function(msg) {};
  this.onStreamerDataChannels = function(msg) {};
  this.onStreamerDataChannelsClosed = function(msg) {};
  this.onPeerDataChannels = function(msg) {};
  this.onIceCandidate = function(msg) {};
  this.onSfuError = function(msg) {};
  this.onDisconnectPlayer = function(msg) {};
  this.onDisconnected = () => {
    this.server.onDisconnectionInternal(this);
  };
};

SfuSocketClient.prototype.close = function(code, reason) {
  this.websocket.close(code, reason);
};

SfuSocketClient.prototype.isConnected = function() {
  return this.websocket && this.websocket.readyState == 1;
};

SfuSocketClient.prototype.send = function(msg) {
  if (typeof(msg) != 'string') {
    msg = JSON.stringify(msg);
  }
  return this.websocket.send(msg);
};

SfuSocketClient.prototype.onClose = function(code, reason) {
  console.error(`sfu disconnected: ${code} - ${reason}`);
  this.onDisconnected();
};

SfuSocketClient.prototype.onError = function(error) {
  console.error(`sfu connection error: ${error}`);
  this.onDisconnected();
  try {
    this.websocket.close(1006 /* abnormal closure */, error);
  } catch(err) {
    console.error(`ERROR: ws.on error: ${err.message}`);
  }
};

SfuSocketClient.prototype.onMessage = function(msgRaw) {
  var msg;
  try {
    msg = JSON.parse(msgRaw);
  } catch (err) {
    console.error(`cannot parse SFU message: ${msgRaw}\nError: ${err}`);
    this.websocket.close(1008, 'Cannot parse json.');
    return;
  }

  try {
    if (msg.type == 'offer') {
      this.onOffer(msg);
    } else if (msg.type == 'answer') {
      this.onAnswer(msg);
    } else if (msg.type == 'streamerDataChannels') {
      this.onStreamerDataChannels(msg);
    } else if (msg.type == 'streamerDataChannelsClosed') {
      this.onStreamerDataChannelsClosed(msg);
    } else if (msg.type == 'peerDataChannels') {
      this.onPeerDataChannels(msg);
    } else if (msg.type == 'error') {
      this.onSfuError(msg);
    } else {
      console.error(`unsupported sfu message type: ${msg.type}`, msg);
    }
  } catch(err) {
    console.error(`ERROR: ws.on message error: ${err.message}`);
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////


let SfuServerSocket = function(port, clientConfig) {
  this.clientConfig = clientConfig;
  this.sfu = null;
  this.sfuServer = new WebSocket.Server({ port: port, backlog: 1 });
  this.sfuServer.on('connection',this.onConnectionInternal.bind(this));
  this.onConnected = function(sfu) {};
  this.onDisconnected = function(sfu) {};
};

SfuServerSocket.prototype.isConnected = function() {
  return this.sfu && this.sfu.isConnected();
};

SfuServerSocket.prototype.send = function(msg) {
  if (!this.isConnected()) {
    console.log(`dropped message ${msg.type} as the sfu is not found`);
    return;
  }
  const rawMsg = JSON.stringify(msg);
	logOutgoing('SFU', msg.type, rawMsg);
  this.sfu.send(rawMsg);
};

SfuServerSocket.prototype.disconnectSFUPlayer = function(code, reason) {
  if (this.isConnected()) {
    this.sfu.close(code, reason);
  }
};

SfuServerSocket.prototype.onConnectionInternal = function(ws, req) {
  // reject if we already have an sfu
  if (this.sfu != null) {
    ws.close(1013, 'Already have SFU.');
    return;
  }

  console.logColor(logging.Green, `SFU (${req.connection.remoteAddress}) connected `);

  this.sfu = new SfuSocketClient(this, ws);
  this.onConnected(this.sfu);
};

SfuServerSocket.prototype.onDisconnectionInternal = function(sfu) {
  this.sfu = null;
  this.onDisconnected(sfu);
};

exports.SfuServerSocket = SfuServerSocket;
