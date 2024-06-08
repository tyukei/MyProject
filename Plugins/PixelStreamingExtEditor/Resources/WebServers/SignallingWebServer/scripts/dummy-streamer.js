
/**********************************************************************/

/*
* Control Messages. Range = 0..49.
*/

IFrameRequest = 0;
RequestQualityControl = 1;
FpsRequest = 2;
AverageBitrateRequest = 3;
StartStreaming = 4;
StopStreaming = 5;
LatencyTest = 6;
RequestInitialSettings = 7;

/**********************************************************************/

/*
* Input Messages. Range = 50..89.
*/

// Generic Input Messages. Range = 50..59.
UIInteraction = 50;
Command = 51;

// Keyboard Input Message. Range = 60..69.
KeyDown = 60;
KeyUp = 61;
KeyPress = 62;

// Mouse Input Messages. Range = 70..79.
MouseEnter = 70;
MouseLeave = 71;
MouseDown = 72;
MouseUp = 73;
MouseMove = 74;
MouseWheel = 75;

// Touch Input Messages. Range = 80..89.
TouchStart = 80;
TouchEnd = 81;
TouchMove = 82;

// Gamepad Input Messages. Range = 90..99
GamepadButtonPressed = 90;
GamepadButtonReleased = 91;
GamepadAnalog = 92;

/**********************************************************************/

/*
* Ensure Count is the final entry.
*/
Count = 93;

/**********************************************************************/


let ws;
let playerId = 101;
let config;

function onConfig(c) {
  config = c
}

function onPlayerConnected(webRTCData) {
  if (webRTCData.playerId) {
    playerId = webRTCData.playerId;
  }

  for (let webRtcPublisher of webRtcPublishers.values()) {
    webRtcPublisher.publishStream(config, function(error) {
      console.log(error);
    })
  
    webRtcPublisher.createOffer().then((offer) => {
      console.log("%c[Outbound SS (offer)]", "background: lightgreen; color: black", offer);
  
      ws.send(JSON.stringify({
        type: 'offer',
        playerId: playerId,
        sceneId: webRtcPublisher.sceneId,
        sdp: offer.sdp
      }));
    })
  }
}

function onPlayerDisconnected(webRTCData) {
  let sceneId = webRTCData.sceneId;
  if (sceneId) {
    let webRtcPublisher = webRtcPublishers.get(sceneId);
    if (webRtcPublisher) {
      webRtcPublisher.stopStream();
    }
  }
}

function onWebRtcOffer(webRTCData) {
}

function onWebRtcAnswer(webRTCData) {
  let sceneId = webRTCData.sceneId;
  if (sceneId) {
    let webRtcPublisher = webRtcPublishers.get(sceneId);
    if (webRtcPublisher) {
      webRtcPublisher.setAnswer(webRTCData)
    }
  }
}

function onWebRtcIce(iceCandidate) {
}

function onWebRtcDataChannel(webRTCData) {
  let sceneId = webRTCData.sceneId;
  if (sceneId) {
    let webRtcPublisher = webRtcPublishers.get(sceneId);
    if (webRtcPublisher) {
      webRtcPublisher.createDataChannel(webRTCData);
    }
  }
}


let webRtcPublishers = new Map();

function setupWebRtcPublisher(stream, sceneId) {
  let webRtcPublisher = new WebRtcPublisher(stream, sceneId);
  webRtcPublisher.onDataChannel = function(playerId, event) {
    let data = new Uint8Array(event.data);
    switch (data[0]) {
    default:
      break;
    case MouseEnter:
      console.log('MouseEnter[' + playerId + ']: ', data);
      break;
    case MouseLeave:
      console.log('MouseLeave[' + playerId + ']: ', data);
      break;
    case MouseDown:
      console.log('MouseDown[' + playerId + ']: ', data);
      break;
    case MouseUp:
      console.log('MouseUp[' + playerId + ']: ', data);
      break;
    case MouseMove:
      {
        let posX = data[2] << 8 | data[1];
        let posY = data[4] << 8 | data[3];
        let deltaX = data[6] << 8 | data[5];
        let deltaY = data[8] << 8 | data[7];

        posX = (posX / 65535.0);
        posY = (posY / 65535.0);
        deltaX = (deltaX / 65535.0);
        deltaY = (deltaY / 65535.0);

        console.log('MouseMove [' + playerId + ']: ' + posX + ', ' + posY + ', ' + deltaX + ', ' + deltaY);
      }
      break;
    case MouseWheel:
      console.log('MouseWheel', data);
      break;
    }
  };

  webRtcPublisher.onIceCandidate = function(event) {
    if (event.candidate == null) {
      return;
    }

    console.log("%c[Outbound SS (iceCandidate)]", "background: lightgreen; color: black", event.candidate);

    ws.send(JSON.stringify({
      type: "iceCandidate", 
      playerId: playerId,
      sceneId: sceneId,
      candidate: event.candidate
    }));
  };
  return webRtcPublisher;
}

async function start() {
  let check = new URLSearchParams(window.location.search).has('sceneId');
  if (check) {
    sceneId = new URLSearchParams(window.location.search).get('sceneId');
  }

  let myVideoList = document.getElementById('myVideoList');
  let nextSceneId = 101;
  let devices = await navigator.mediaDevices.enumerateDevices();
  for (let device of devices) {
    if (device.kind == 'videoinput') {
      let sceneId = '' + nextSceneId;
      let stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: device.deviceId
        },
        audio: true,
      });

      let myVideo = document.createElement('video');
      myVideo.srcObject = stream
      myVideoList.appendChild(myVideo);

      myVideo.play();

      let webRtcPublisher = setupWebRtcPublisher(stream, sceneId);
      webRtcPublishers.set(sceneId, webRtcPublisher);
      nextSceneId++;
    }
  }

  connect();
}

function connect() {
  "use strict";

  window.WebSocket = window.WebSocket || window.MozWebSocket;

  if (!window.WebSocket) {
    alert('Your browser doesn\'t support WebSocket');
    return;
  }

  ws = new WebSocket("ws://localhost:8888");

  ws.onmessage = function(event) {
    let msg = JSON.parse(event.data);
    if (msg.type === 'config') {
      console.log("%c[Inbound SS (config)]", "background: lightblue; color: black", msg);
      onConfig(msg);
    } else if (msg.type === 'playerConnected') {
      console.log("%c[Inbound SS (playerConnected)]", "background: lightblue; color: black", msg);
      onPlayerConnected(msg);
    } else if (msg.type === 'playerDisconnected') {
      console.log("%c[Inbound SS (playerDisconnected)]", "background: lightblue; color: black", msg);
      onPlayerDisconnected(msg);
    } else if (msg.type === 'offer') {
      console.log("%c[Inbound SS (offer)]", "background: lightblue; color: black", msg);
      onWebRtcOffer(msg);
    } else if (msg.type === 'answer') {
      console.log("%c[Inbound SS (answer)]", "background: lightblue; color: black", msg);
      onWebRtcAnswer(msg);
    } else if (msg.type === 'iceCandidate') {
      console.log("%c[Inbound SS (iceCandidate)]", "background: lightblue; color: black", msg);
      onWebRtcIce(msg.candidate);
    } else if (msg.type === 'streamerDataChannels') {
      console.log("%c[Inbound SS (streamerDataChannels)]", "background: lightblue; color: black", msg);
      onWebRtcDataChannel(msg);
    } else if(msg.type === 'warning' && msg.warning) {
      console.warn(msg.warning);
    } else {
      console.error("Invalid SS message type", msg.type);
    }
  };

  ws.onerror = function(event) {
    console.log(`WS error: ${JSON.stringify(event)}`);
  };

  ws.onclose = function(event) {
    console.log(`WS closed: ${JSON.stringify(event.code)} - ${event.reason}`);
    ws = undefined;
  };
}

function load() {
  start();
}
