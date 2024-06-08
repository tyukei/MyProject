// Copyright Epic Games, Inc. All Rights Reserved.

//-- Server side logic. Serves pixel streaming WebRTC-based page, proxies data back to Streamer --//

var express = require('express');
var app = express();

const fs = require('fs');
const path = require('path');
const logging = require('./modules/logging.js');

const streamerMgr = require('./streamer-ws-manager.js');
const sfuMgr = require('./sfu-ws-manager.js');
const playerMgr = require('./player-ws-manager.js');
const CloseCode = require('./ws-close-code.js')
const CameraMode = require("./camera-mode.js");

logging.RegisterConsoleLogger();

// Command line argument --configFile needs to be checked before loading the config, all other command line arguments are dealt with through the config object

const config = require('./config.js')();

if (config.LogToFile) {
	logging.RegisterFileLogger('./logs');
}

const http = require('http').Server(app);

if (config.UseHTTPS) {
	// HTTPS certificate details
	const options = {
		key: fs.readFileSync(path.join(__dirname, './certificates/client-key.pem')),
		cert: fs.readFileSync(path.join(__dirname, './certificates/client-cert.pem'))
	};
	var https = require('https').Server(options, app);
}

const helmet = require('helmet');
const hsts = require('hsts');
const httpPort = config.HttpPort;
const httpsPort = config.HttpsPort;
const streamerPort = config.StreamerPort; // port to listen to Streamer connections
const sfuPort = config.SFUPort;
// `clientConfig` is send to Streamer and Players
// Example of STUN server setting
// let clientConfig = {peerConnectionOptions: { 'iceServers': [{'urls': ['stun:34.250.222.95:19302']}] }};
const clientConfig = config.peerConnectionOptions;

if (config.UseHTTPS) {
	app.use(helmet());

	app.use(hsts({
		maxAge: 15552000  // 180 days in seconds
	}));

	//Setup http -> https redirect
	console.log('Redirecting http->https');
	app.use(function (req, res, next) {
		if (!req.secure) {
			if (req.get('Host')) {
				var hostAddressParts = req.get('Host').split(':');
				var hostAddress = hostAddressParts[0];
				if (httpsPort != 443) {
					hostAddress = `${hostAddress}:${httpsPort}`;
				}
				return res.redirect(['https://', hostAddress, req.originalUrl].join(''));
			} else {
				console.error(`unable to get host name from header. Requestor ${req.ip}, url path: '${req.originalUrl}', available headers ${JSON.stringify(req.headers)}`);
				return res.status(400).send('Bad Request');
			}
		}
		next();
	});
}

// デバッグ用
// カメラ情報のリストを返却する WebAPI。
// TODO: これらの API は振り分けサーバなどが行う処理だと思います。
// 不要になると思いますので、この処理は削除してください。
// 
// {
//   type: 'sceneList',
//   scenes: [
//     {
//        cameraMode: 'Fixed',
//        sceneId: 'xxxxxx',
//        playerId: '',
//     },
//     {
//        cameraMode: '3rdPerson',
//        sceneId: 'xxxxxx',
//        playerId: '0',
//     },
//   ]
// }
// 
app.get('/sceneList', (req, res) => {
	res.set({ 'Access-Control-Allow-Origin': '*' });

	let scenes = [];
	const streamers = streamerServer.getStreamers();
	for (let streamerId of streamers.keys()) {
		const streamer = streamers.get(streamerId);
		let scene = {
			cameraMode: streamer.cameraMode,
			sceneId: streamer.streamerId,
			playerId: streamer.playerId,
		}
		scenes.push(scene);
	}

	res.send(JSON.stringify({
		type: 'sceneList',
		scenes: scenes
	}))
});
// ここまで。

app.use((req, res, next) => {
	res.status(404).send('<h1>Not found page.</h1>');
});

// Setup http and https servers
http.listen(httpPort, function () {
	console.logColor(logging.Green, 'Http listening on *: ' + httpPort);
});

if (config.UseHTTPS) {
	https.listen(httpsPort, function () {
		console.logColor(logging.Green, 'Https listening on *: ' + httpsPort);
	});
}

console.logColor(logging.Cyan, `Running Cirrus - The Pixel Streaming reference implementation signalling server for Unreal Engine 5.0.`);
console.logColor(logging.Green, `WebSocket listening for Streamer connections on :${streamerPort}`)

let streamerServer = new streamerMgr.StreamerServerSocket(streamerPort, config.UseHTTPS);
streamerServer.onConnected = (streamer) => {
	streamer.onOffer = function(msg) {
		sfuServer.send(msg);
	};

	streamer.onAnswer = function(msg) {
		sfuServer.send(msg);
	};
  
	streamer.onIceCandidate = function(msg) {
		sfuServer.send(msg);
	};

	streamer.onDisconnectPlayer = function(msg) {
		let playerId = msg.playerId;
		playerServer.disconnectPlayer(playerId, CloseCode.WS_CODE_KICK_BY_STREAMER, 'Closed due to being kicked by a streamer.');
	};

	streamer.onDisconnectScene = function(msg) {
		// Streamer が切断されたので、SFUサーバ、プレイヤーに送信します。
		sfuServer.send(msg);
		playerServer.sendAll(msg);
		// TODO ここで、プレイヤーを切断したほうが良いかな？
	}

	streamer.onStreamerDataChannelsFailed = function(msg) {
		// プラグインで DataChannel 生成失敗エラーが送られてきた場合には
		// 該当のプレイヤーを切断します。
		const playerId = msg.playerId;
		if (playerId) {
			playerServer.disconnectPlayer(playerId, CloseCode.WS_CODE_PLUGIN_ABNORMAL_CLOSE, 'Abnormal close due to data channel problem.');
		}
	};

	streamer.onEndPointId = function(msg) {
		console.log(`endpointId: ${msg.id}`);

		// mediasoup に接続されている場合には、PixelStreaming に送信
		if (sfuServer.isConnected()) {
			streamer.send(JSON.stringify({
				type: 'sfuConnected'
			}));
		}
	}

	// config を Streamer に送信
	streamer.send(JSON.stringify(clientConfig));

	// identify を Streamer に送信
	streamer.send(JSON.stringify({
		type: 'identify'
	}));
};

streamerServer.onDisconnected = (streamer) => {
	console.log('streamer is disconnected.');

	// TODO Streamer は socket が別れたので、複数回呼び出されます。
	// ここの処理が問題ないか確認が必要になります。
	playerServer.disconnectAllPlayers();
	if (sfuServer.isConnected()) {
		sfuServer.send({ type: "streamerDisconnected" });
	}
};

console.logColor(logging.Green, `WebSocket listening for SFU connections on :${sfuPort}`);

let sfuServer = new sfuMgr.SfuServerSocket(sfuPort);
sfuServer.onConnected = (sfu) => {
  sfu.onOffer = function(msg) {
		const playerId = msg.playerId;
		delete msg.playerId;
		playerServer.send(playerId, msg);
	};

	sfu.onAnswer = function(msg) {
		const streamerId = msg.sceneId;

		// SFU から Answer を Streamer に送信します。
		streamerServer.sendToStreamer(streamerId, msg);

		// TODO 定点カメラの場合はどうするべきか?
		// Room 生成完了をプレイヤーに通知します。
		const streamer = streamerServer.getStreamer(streamerId);
		if (streamer && streamer.playerId) {
			if (streamer.cameraMode == CameraMode.CAMERA_MODE_3RD_PERSON || 
				streamer.cameraMode == CameraMode.CAMERA_MODE_3RD_PERSON_AI) {
				playerServer.send(streamer.playerId, {
					type: 'streamerReady',
					sceneId: streamerId
				});
			}
		}
	};

	sfu.onStreamerDataChannels = function(msg) {
		const sceneId = msg.sceneId;
		// PS 拡張プラグインでは Streamer の名前を SFU として保持しています。
		// ここでは、この値を入れる必要があります。
		msg.sfuId = 'SFU';
		streamerServer.sendToStreamer(sceneId, msg);
	};

	sfu.onStreamerDataChannelsClosed = function(msg) {
		const sceneId = msg.sceneId;
		streamerServer.sendToStreamer(sceneId, msg);
	};

	sfu.onPeerDataChannels = function(msg) {
		const playerId = msg.playerId;
		delete msg.playerId;
		playerServer.send(playerId, msg);
		playerServer.setDataChannelFlag(playerId);
	};

	sfu.onSfuError = function(msg) {
		// SFU からプレイヤー宛にエラーが送られてきた場合には
		// 該当のプレイヤーを切断します。
		const playerId = msg.playerId;
		if (playerId) {
			playerServer.disconnectPlayer(playerId, CloseCode.WS_CODE_SFU_ABNORMAL_CLOSE, 'An error occurred in SFU server.');
		}
	};

	// 既に Streamer に接続されている場合には、
	// mediasoup に接続されたことを PixelStreaming に通知
	if (streamerServer.isConnected()) {
		streamerServer.sendSfuConnected();
	}
};

sfuServer.onDisconnected = (sfu) => {
	console.log('sfu is disconnected.', sfu);
	playerServer.disconnectAllPlayers();
	streamerServer.sendSfuDisconnected();
};


console.logColor(logging.Green, `WebSocket listening for Players connections on :${httpPort}`);

let playerServer = new playerMgr.PlayerServerSocket({ server: config.UseHTTPS ? https : http});
playerServer.onConnected = (player) => {

	player.onListStreamers = function(msg) {
		// Web クライアントに Streamer のリストを送信します。
		player.send(JSON.stringify({
			type: 'streamerList',
			ids: streamerServer.getStreamerIds()
		}));
	}

	// JWT 検証結果が成功した場合の処理を行います。
	player.onJWTSuccess = () => {
		// WebRTC の設定情報を送信
		player.send(JSON.stringify(clientConfig));

		// プレイヤーに playerId を送信
		player.sendPlayerId();
		
		// Streamer が接続されているの処理を行います。
		// playerConnected イベントを Streamer に通知します。
		player.sendPlayerConnected();

		// すべてのプレイヤーに参加人数を送信します。
		playerServer.sendPlayersCount();
	}

	//// Streamer 側に送信します。

	player.onPlayerConnected = function(msg) {
		streamerServer.sendAll(msg);
	}
	
	player.onPlayerDisconnected = function(msg) {
		streamerServer.sendAll(msg);
	}

	player.onPlayerGoingAway = function(msg) {
		streamerServer.sendAll(msg);
	}

	//// SFU 側に送信します。

	player.onSubscribe = function(msg) {
		// subscribe が呼び出されたときに、SFU に接続を行います。
		sfuServer.send({
			type: 'sceneConnected',
			playerId: msg.playerId,
			sceneId: msg.streamerId
		});
	}

	player.onSceneConnected = function(msg) {
		sfuServer.send(msg);
	};

	player.onSceneDisconnected = function(msg) {
		sfuServer.send(msg);
	};

	player.onOffer = function(msg) {
		sfuServer.send(msg);
	};

	player.onAnswer = function(msg) {
		sfuServer.send(msg);
	};

	player.onDataChannelRequest = function(msg) {
		sfuServer.send(msg);
	};

	player.onPeerDataChannelsReady = function(msg) {
		sfuServer.send(msg);
	}

	player.onCloseDataChannelRequest = function(msg) {
		sfuServer.send(msg);
	};

	if (!streamerServer.isConnected()) {
		// UE クライアントが接続されていない場合は、シグナリングサーバから切断します。
		player.close(CloseCode.WS_CODE_NOT_FOUND_STREAMER, 'The streamer is not found.');
	}
};

playerServer.onDisconnected = (player) => {
	try {
		console.log('Player disconnected. playerId=' + player.playerId);
		playerServer.sendPlayersCount();
	} catch(err) {
		console.logColor(logging.Red, `ERROR:: onPlayerDisconnected error: ${err.message}`);
	}
};

playerServer.GetStreamerList = () => {
	return streamerServer.getStreamers();
};
