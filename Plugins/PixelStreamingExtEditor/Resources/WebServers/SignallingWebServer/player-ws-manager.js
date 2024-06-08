const logging = require('./modules/logging.js');
const CloseCode = require('./ws-close-code.js')
const CameraMode = require("./camera-mode.js");
const WebSocket = require('ws');

/**
 * デバッグフラグ。
 * 1 または 2 を指定することで、送られてくるメッセージをログに表示します。
 */
const DEBUG_LOG = 0;

/**
 * 設定ファイルを読み込みます。
 */
const config = require('./config.js')();

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


// JWT 検証用ライブラリ
// 使用するためには、インストールする必要があります。
var jwtInspection;
if (config.EnableJWT) {
  jwtInspection = require('./modules/JWTInjection/JwtInspection');
}

/**
 * JWT 検証を行います。
 * 
 * @param {String} jwtToken JWTトークン
 * @returns JWT 検証に成功した場合は true、それ以外は false を返却します。
 */
async function checkJWTToken(jwtToken) {
  if (config.EnableJWT) {
    let result = await jwtInspection.JWTCheck(jwtToken, "ps-ext-signalling-server");
    let flag = result[0];
    let user_id = result[1];
    console.log('JWT Reslut : ' + flag + ', user_id : ' + user_id);
    return flag;
  } else {
    // JWT 検証を行わない場合は、こちらで処理を行います。
    return true;
  }
}

let PlayerSocketClient = function(server, ws, playerId) {
  this.server = server;
  this.datachannel = false;
  this.playerId = playerId;
  this.cameraMode = undefined;
  this.metaCommId = undefined;
  this.websocket = ws;
  this.websocket.isAlive = true;
  this.discNotified = false;
  this.websocket.on('message', this.onMessage.bind(this));
  this.websocket.on('close', this.onClose.bind(this));
  this.websocket.on('error', this.onError.bind(this));
  this.websocket.on('pong', this.onPong.bind(this));
  this.onJWTSuccess = function() {};
  this.onPlayerConnected = function(msg) {};
  this.onSceneConnected = function(msg) {};
  this.onSceneDisconnected = function(msg) {};
  this.onOffer = function(msg) {};
  this.onAnswer = function(msg) {};
  this.onDataChannelRequest = function(msg) {};
  this.onCloseDataChannelRequest = function(msg) {};
  this.onPeerDataChannels = function(msg) {};
  this.onPeerDataChannelsReady = function(msg) {};
  this.onIceCandidate = function(msg) {};
  this.onIdRequest = function(msg) {};
  this.onIdentify = function(msg) {};
  this.onListStreamers = function(msg) {};
  this.onDisconnected = (code, reason) => {
    try {
      // Websocket サーバ側の切断処理を呼び出します。
      console.log(`disconnection code : ${code}, reason : ${reason}`)
      this.server.onDisconnectionInternal(this, code, reason);
    } catch (e) {
      console.log('PlayerSocketServer.onDisconnectionInternal', e);
    }
  };
};

PlayerSocketClient.prototype.close = function(code, reason) {
  this.websocket.close(code, reason);
};

PlayerSocketClient.prototype.isConnected = function() {
  return this.websocket && this.websocket.readyState == 1;
};

PlayerSocketClient.prototype.send = function(msg) {
  if (typeof(msg) !== 'string') {
    // 引数が文字列以外の場合は、文字列に変換します。
    msg = JSON.stringify(msg);
  }
  return this.websocket.send(msg);
};

PlayerSocketClient.prototype.sendPlayerId = function() {
  return this.websocket.send(JSON.stringify({
    type: 'playerId',
    playerId: this.playerId
  }));
};

PlayerSocketClient.prototype.sendPlayerConnected = function() {
  let msg = {
    type: 'playerConnected',
    playerId: this.playerId
  };
  this.onPlayerConnected(msg);
};

PlayerSocketClient.prototype.sendIdentify = function() {
  let msg = {
    type: 'identify'
  };
  this.onIdentify(msg);
};

PlayerSocketClient.prototype.sendPlayerDisconnected = function() {
  let msg = {
    type: 'playerDisconnected',
    playerId: this.playerId
  };
  this.onPlayerDisconnected(msg);
};

PlayerSocketClient.prototype.sendPlayerGoingAway = function() {
  if (this.playerId) {
    let msg = {
      type: 'playerGoingAway',
      playerId: this.playerId
    };
    this.onPlayerGoingAway(msg);
  }
};

PlayerSocketClient.prototype.sendSceneDisconnected = function() {
  let msg = {
    type: 'sceneDisconnected',
    playerId: this.playerId
  };
  this.onSceneDisconnected(msg);
};

// ユーザ情報を受け取り JWT 検証を行います。
PlayerSocketClient.prototype.onUserInfo = async function(msg) {
  this.cameraMode = msg.cameraMode;
  this.metaCommId = msg.metaCommId;

  // メタコミIDが重複していないか確認を行う。
  let playerSocket = this.server.getPlayerSocketByMetaCommId(this.metaCommId);
  if (playerSocket) {
    // メタコミIDが重複している場合の処理を行う。
    // 後勝ちになる想定ですので、ここで、以前のソケットを閉じる処理を行います。
    playerSocket.close(CloseCode.WS_CODE_DUPLICATE_METACOMM_ID, 'Duplicate metaCommId.');
    return;
  }

  // カメラモードごとに必要な PlayerId を割り振ります。
  switch (this.cameraMode) {
    default:  // TODO: カメラモードが未定の場合は三人称カメラとして扱って良いか？
    case CameraMode.CAMERA_MODE_3RD_PERSON:
    {
      // ここで、StreamerList の中で空いているPlayerId を取得します。
      let playerId = this.server.getFreePlayerIdForThirdPerson();
      if (playerId == undefined) {
        this.websocket.close(CloseCode.WS_CODE_PLAYER_IS_FULL, 'Player is full.');
        return;
      } else {
        this.playerId = playerId;
        this.server.players.set(this.playerId, this);
      }
    }
      break;
    case CameraMode.CAMERA_MODE_FIXED:
    {
      // ここで、StreamerList 以外の中で空いているPlayerId を取得します。
      let playerId = this.server.getFreePlayerIdForFixed();
      if (playerId == undefined) {
        this.websocket.close(CloseCode.WS_CODE_PLAYER_IS_FULL, 'Player is full.');
        return;
      } else {
        this.playerId = playerId;
        this.server.players.set(this.playerId, this);
      }
    }
      break;
    case CameraMode.CAMERA_MODE_3RD_PERSON_AI:
    {
      // ここで、StreamerList の中で空いているPlayerId を取得します。
      let playerId = this.server.getFreePlayerIdForThirdPersonAI();
      if (playerId == undefined) {
        this.websocket.close(CloseCode.WS_CODE_PLAYER_IS_FULL, 'Player is full.');
        return;
      } else {
        this.playerId = playerId;
        this.server.players.set(this.playerId, this);
      }
    }
      break;
    case CameraMode.CAMERA_MODE_FIXED_AI:
    {
      // ここで、StreamerList 以外の中で空いているPlayerId を取得します。
      let playerId = this.server.getFreePlayerIdForFixedAI();
      if (playerId == undefined) {
        this.websocket.close(CloseCode.WS_CODE_PLAYER_IS_FULL, 'Player is full.');
        return;
      } else {
        this.playerId = playerId;
        this.server.players.set(this.playerId, this);
      }
    }
      break;
  }

  let jwtToken = msg.jwtToken;
  let result = await checkJWTToken(jwtToken);
  if (result) {
    // JWT 検証に成功
    this.onJWTSuccess();
  } else {
    // JWT 検証検証に失敗したので切断します。
    this.close(CloseCode.WS_CODE_JWT_ERROR, 'JWT ERROR');
  }
};

PlayerSocketClient.prototype.onPong = function() {
  this.websocket.isAlive = true;
};

PlayerSocketClient.prototype.onClose = function(code, reason) {
  console.error(`player ${this.playerId} disconnected: ${code} - ${reason}`);
  // code が WS_CODE_ALREAD_EXIST_PLAYER の場合には、既に PlayerId が存在するので、
  // onDisconnected のイベントは発生させない。
  if (code != CloseCode.WS_CODE_ALREAD_EXIST_PLAYER) {
    // errorが発生していない場合、SFU/UEに切断を通知する
    if (!this.discNotified) {
      this.discNotified = true;
    this.onDisconnected(code, reason);
    } else {
      console.log('disconnection already notified.')
    }
  }
};

PlayerSocketClient.prototype.onError = function(error) {
  console.error(`player ${this.playerId} connection error: ${error}`);
  try {
    this.websocket.close(CloseCode.WS_CODE_ABNORMAL_CLOSE /* abnormal closure */, error);
    // close済みでない場合、SFU/UEに切断を通知する
    if (!this.discNotified) {
      this.discNotified = true;
      this.onDisconnected(CloseCode.WS_CODE_ABNORMAL_CLOSE, error);
    } else {
      console.log('disconnection already notified.')
    }
  } catch(err) {
    console.error(`ERROR: ws.on error: ${err.message}`);
  }
};

PlayerSocketClient.prototype.onMessage = function(msgRaw) {
  var msg;
  try {
    msg = JSON.parse(msgRaw);
  } catch (err) {
    console.error(`cannot parse player ${this.playerId} message: ${msgRaw}\nError: ${err}`);
    this.websocket.close(1008, 'Cannot parse json.');
    return;
  }

  logIncoming(`player ${this.playerId}`, msg.type, msgRaw);

  if (!msg || !msg.type) {
    console.error(`Cannot parse message ${msgRaw}`);
    return;
  }

  try {
    msg.playerId = this.playerId;

    if (msg.type == 'userInfo') {
      this.onUserInfo(msg);
    } else if (msg.type == 'subscribe') {
      this.onSubscribe(msg);
    } else if (msg.type == 'sceneConnected') {
      this.onSceneConnected(msg);
    } else if (msg.type == 'sceneDisconnected') {
      this.onSceneDisconnected(msg);
    } else if (msg.type == 'answer') {
      this.onAnswer(msg);
    } else if (msg.type == 'iceCandidate') {
      this.onIceCandidate(msg);
    } else if (msg.type == 'stats') {
      console.log(`player ${this.playerId}: stats\n${msg.data}`);
    } else if (msg.type == "dataChannelRequest") {
      this.onDataChannelRequest(msg);
    } else if (msg.type == 'peerDataChannelsReady') {
      this.onPeerDataChannelsReady(msg);
    } else if (msg.type == 'closeDataChannelRequest') {
      this.onCloseDataChannelRequest(msg);
    } else if (msg.type == "identify") {
      this.onIdRequest(msg);
    } else if (msg.type == 'listStreamers') {
      this.onListStreamers(msg);
    } else {
      console.error(`player ${this.playerId}: unsupported message type: ${msg.type}`);
    }
  } catch(err) {
    console.error(`ERROR: ws.on message error: ${err.message}`);
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////


let PlayerServerSocket = function(options) {
  // playerId を割り振るための ID になります。
  this.nextPlayerId = 0;
  // プレイヤーを管理するためのマップ.
  // key には、PlayerId を使用します。
  this.players = new Map();
  this.playerServer = new WebSocket.Server(options);
  this.playerServer.on('connection', this.onConnectionInternal.bind(this));
  this.playerServer.on('close', () => {
    // 終了時に ping 用のインターバルを解除します。
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  });
  this.onConnected = function(socket) {};
  this.onDisconnected = function(socket) {};
  this.GetStreamerList = function() { return undefined; };

  // 各クライアントとの接続を行うための ping を行うためのインターバルを起動します。
  this.pingTimer = setInterval(() => {
    this.playerServer.clients.forEach((ws) => {
      if (ws.isAlive == false) {
        ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.KeepAlive);
};

PlayerServerSocket.prototype.getPlayer = function(playerId) {
  return this.players.get(playerId);
};

PlayerServerSocket.prototype.send = function(playerId, msg) {
  let player = this.getPlayer(playerId);
	if (!player) {
		console.log(`dropped message ${msg.type} as the player ${playerId} is not found`);
		return;
	}
	const playerName = `player ${playerId}`;
	const rawMsg = JSON.stringify(msg);
	logOutgoing(playerName, msg.type, rawMsg);
	player.send(rawMsg);
};

PlayerServerSocket.prototype.sendAll = function(msg) {
  for (let player of this.players.values()) {
    player.send(msg);
	}
}

PlayerServerSocket.prototype.sendPlayersCount = function() {
  let playerCountMsg = JSON.stringify({
    type: 'playerCount',
    count: this.players.size
  });
  this.sendAll(playerCountMsg);
};

PlayerServerSocket.prototype.setDataChannelFlag = function(playerId) {
  const player = this.getPlayer(playerId);
  if (!player) {
    console.log(`Not found a player. playerId=${playerId}`);
    return;
  }
  // DataChannel の接続状況を設定します。
  player.datachannel = true;
};

PlayerServerSocket.prototype.disconnectAllPlayers = function(code, reason) {
  console.log("killing all players");
	let clone = new Map(this.players);
	for (let player of clone.values()) {
    player.close(code, reason);
	}
  this.players = new Map();
};

PlayerServerSocket.prototype.disconnectPlayer = function(playerId, code, reason) {
  console.log("killing player. playerId=" + playerId);
  const player = this.getPlayer(playerId);
  if (player) {
    player.close(code, reason);
  }
};

// 指定されたカメラモード用の PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerIdForCameraMode = function(cameraMode) {
  const streamers = this.GetStreamerList();
  for (let streamerId of streamers.keys()) {
    const streamer = streamers.get(streamerId);
    if (streamer.cameraMode == cameraMode) {
      let playerId = streamer.playerId;
      if (playerId) {
        if (!this.players.has('' + playerId)) {
          return '' + playerId;
        }
      }
    }
  }
  return undefined;
};

// 指定された playerId が紐づけられた指定カメラモードが存在するか確認します。
PlayerServerSocket.prototype.hasCameraMode = function(playerId, cameraMode) {
  const streamers = this.GetStreamerList();
  for (let streamerId of streamers.keys()) {
    const streamer = streamers.get(streamerId);
    if (streamer.cameraMode == cameraMode) {
      if (playerId == streamer.playerId) {
        return true;
      }
    }
  }
  return false;
};

// 三人称カメラ用の PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerIdForThirdPerson = function() {
  return this.getFreePlayerIdForCameraMode(CameraMode.CAMERA_MODE_3RD_PERSON);
};

// 指定された playerId が紐づけられた三人称カメラが存在するか確認します。
PlayerServerSocket.prototype.hasThirdPersonCamera = function(playerId) {
  return this.hasCameraMode(playerId, CameraMode.CAMERA_MODE_3RD_PERSON);
};

// カメラ無し用の PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerIdForThirdPersonAI = function() {
  let playerId = this.getFreePlayerIdForCameraMode(CameraMode.CAMERA_MODE_3RD_PERSON_AI);
  if (playerId == undefined) {
    playerId = this.getFreePlayerId();
  }
  return playerId;
};

// 定点カメラ用の PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerIdForFixed = function() {
  return this.getFreePlayerId();
};

// 定点カメラ用の PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerIdForFixedAI = function() {
  return this.getFreePlayerId();
};

// 指定された playerId が紐づけられたカメラ無しが存在するか確認します。
PlayerServerSocket.prototype.hasThirdPersonAICamera = function(playerId) {
  return this.hasCameraMode(playerId, CameraMode.CAMERA_MODE_3RD_PERSON_AI);
};

// PlayerId で空きを探します。
// 空きが存在しない場合には undefined を返却します。
PlayerServerSocket.prototype.getFreePlayerId = function() {
  for (let idx = 0; idx < config.maxPlayerControllers; ++idx) {
    let playerId = (this.nextPlayerId + idx) % config.maxPlayerControllers;
    // 使用されている PlayerId か確認し、他のカメラ用の PlayerId でないことを確認します。
    if (!this.players.has('' + playerId) && !this.hasThirdPersonCamera('' + playerId) && !this.hasThirdPersonAICamera('' + playerId)) {
      this.nextPlayerId = (playerId + 1) % config.maxPlayerControllers;
      return '' + playerId;
    }
  }
  return undefined;
};

// プレイヤー情報の中に同じメタコミIDを持つプレイヤーを取得します。
PlayerServerSocket.prototype.getPlayerSocketByMetaCommId = function(metaCommId) {
  let clone = new Map(this.players);
  for (let key of clone.keys()) {
    let player = this.players.get(key);
    if (player.metaCommId == metaCommId) {
      return player;
    }
  }
  return undefined;
};


PlayerServerSocket.prototype.onConnectionInternal = function(ws, req) {
  let playerClient = new PlayerSocketClient(this, ws);
  this.onConnected(playerClient);
};

PlayerServerSocket.prototype.onDisconnectionInternal = function(player, code, reason) {
  // シグナリングサーバから playerId を削除します。
  let playerId = player.playerId;
	this.players.delete(playerId);

  // UE 側に切断されたことを通知
  // カメラ切り替え時の close コードの場合は、playerDisconnected を通知
  // それ以外の close コードの場合は、playerGoingAway を通知
  if (code == CloseCode.WS_CODE_CAMERA_CHANGE) {
    player.sendPlayerDisconnected();
  } else  {
    player.sendPlayerGoingAway();
  }

  // SFU 側に切断されたことを通知
  player.sendSceneDisconnected();

  this.onDisconnected(player);
};

exports.PlayerServerSocket = PlayerServerSocket;
