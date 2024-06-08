const config = require('./config');
const WebSocket = require('ws');
const mediasoup = require('mediasoup_prebuilt');
const RoomManager = require('./room-manager.js');
const AsyncQueue = require('./async-queue.js')();

let signalServer = null;
let roomMgr = new RoomManager.RoomManager();

function connectSignalling(server) {
  console.log("Connecting to Signalling Server at %s", server);
  signalServer = new WebSocket(server);
  signalServer.addEventListener("open", _ => { console.log(`Connected to signalling server`); });
  signalServer.addEventListener("error", result => { console.log(`Error: ${result.message}`); });
  signalServer.addEventListener("message", result => onSignallingMessage(result.data));
  signalServer.addEventListener("close", result => { 
    console.log(`Disconnected from signalling server: ${result.code} ${result.reason}`);
    console.log("Attempting reconnect to signalling server...");

    // WS が切断されたので、Producer、Consumer を削除します。
    roomMgr.deleteAllRooms();

    // 2秒ごとに再接続を行います。
    setTimeout(()=> { 
      connectSignalling(server);
    }, 2000); 
  });
}

async function onStreamerOffer(msg) {
  console.log("Got offer from streamer. Create room %s.", msg.sceneId);

  let room = roomMgr.createRoom(msg.sceneId);
  let answer = await room.createProducer(msg);
  console.log("Sending answer to streamer.");
  signalServer.send(JSON.stringify(answer));
}

async function onStreamerDisconnected(msg) {
  console.log("Streamer disconnected.", msg.sceneId);

  if (msg.sceneId) {
    roomMgr.deleteRoom(msg.sceneId);
  } else {
    roomMgr.deleteAllRooms();
  }
}

async function onPeerConnected(msg) {
  console.log("Player %s joined. sceneId: %s", msg.playerId, msg.sceneId);

  let room = roomMgr.getRoom(msg.sceneId);
  if (room) {
    let offer = await room.createConsumer(msg);
    if (offer) {
      signalServer.send(JSON.stringify(offer));
    } else {
      // エラーを返却すること。
      signalServer.send(JSON.stringify({
        type: "error",
        playerId: msg.playerId
      }));
    }
    console.log("Sending offer to player %s", msg.playerId);
  }
}

async function setupPeerDataChannels(msg) {
  console.log("Setup DataChannel playerId: %s, sceneId: %s", msg.playerId, msg.sceneId);
  
  let room = roomMgr.getRoom(msg.sceneId);
  if (room) {
    var { peerSignal, streamerSignal } = await room.setupPeerDataChannels(msg);
    if (peerSignal && streamerSignal) {
      signalServer.send(JSON.stringify(streamerSignal));
      signalServer.send(JSON.stringify(peerSignal));
    } else {
      // エラーを返却すること。
      signalServer.send(JSON.stringify({
        type: "error",
        playerId: msg.playerId
      }));
    }
  }
}

async function tearDownPeerDataChannels(msg) {
  console.log("TearDown DataChannel playerId: %s, sceneId: %s", msg.playerId, msg.sceneId);
  
  let room = roomMgr.getRoom(msg.sceneId);
  if (room) {
    let streamerSignal = await room.tearDownPeerDataChannels(msg);
    if (streamerSignal) {
      signalServer.send(JSON.stringify(streamerSignal));
    }
  }
}

async function onPeerAnswer(msg) {
  console.log("Got answer from player %s. sceneId: %s", msg.playerId, msg.sceneId);

  let room = roomMgr.getRoom(msg.sceneId);
  if (room) {
    await room.onAnswer(msg);
  }
}

async function onPeerDisconnected(msg) {
  console.log("Player %s disconnected. sceneId: %s", msg.playerId, msg.sceneId);

  roomMgr.deletePlayer(msg.sceneId, msg.playerId);
}

function onSignallingMessage(message) {
	// console.log(`Got MSG: ${message}`);
  const msg = JSON.parse(message);

  if (msg.type == 'offer') {
    AsyncQueue.enqueue((next) => {
      onStreamerOffer(msg).then(next).catch(next);
    });
  } else if (msg.type == 'answer') {
    AsyncQueue.enqueue((next) => {
      onPeerAnswer(msg).then(next).catch(next);
    });
  } else if (msg.type == 'sceneConnected') {
    AsyncQueue.enqueue((next) => {
      onPeerConnected(msg).then(next).catch(next);
    });
  } else if (msg.type == 'sceneDisconnected') {
    AsyncQueue.enqueue((next) => {
      onPeerDisconnected(msg).then(next).catch(next);
    });
  } else if (msg.type == 'streamerDisconnected') {
    AsyncQueue.enqueue((next) => {
      onStreamerDisconnected(msg).then(next).catch(next);
    });
  } else if (msg.type == 'dataChannelRequest') {
    AsyncQueue.enqueue((next) => {
      setupPeerDataChannels(msg).then(next).catch(next);
    })
  } else if (msg.type == 'closeDataChannelRequest') {
    AsyncQueue.enqueue((next) => {
      tearDownPeerDataChannels(msg).then(next).catch(next);
    })
  } else if (msg.type == 'iceCandidate') {
  } else if (msg.type == 'disconnectScene') {
    AsyncQueue.enqueue((next) => {
      onStreamerDisconnected(msg).then(next).catch(next);
    })
  } else {
    console.log('Unknown message type. type=' + msg.type);
  }

  // todo a new message type for force layer switch (for debugging)
  // see: https://mediasoup.org/documentation/v3/mediasoup/api/#consumer-setPreferredLayers
  // preferredLayers for debugging to select a particular simulcast layer, looks like { spatialLayer: 2, temporalLayer: 0 }
}

async function main() {
  console.log('Starting Mediasoup...');
  console.log("Config = ");
  console.log(config);

  connectSignalling(config.signallingURL);
}

main();
