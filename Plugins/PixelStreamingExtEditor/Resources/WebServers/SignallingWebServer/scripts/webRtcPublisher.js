
function WebRtcPublisher(stream, sceneId) {
  let webrtcPeerConnection;
  let webrtcConfiguration;
  let reportError;
  let dataChannel;
  let dataChannels = new Map();

  this.sceneId = sceneId;

  /**
   * WebRTC の状態が変更された時の呼び出される。
   * @param {*} event 
   */
  function onConnectionStateChange(event) {
    console.log('webrtcPeerConnection: ' + webrtcPeerConnection.connectionState, event)
    switch(webrtcPeerConnection.connectionState) {
      case "connected":
        // The connection has become fully connected
        break;
      case "disconnected":
      case "failed":
        // One or more transports has terminated unexpectedly or in an error
        break;
      case "closed":
        // The connection has been closed
        break;
    }
  }
  this.onConnectionStateChange = onConnectionStateChange;

  /**
   * WebRTC から ICE の設定が渡される場合に呼び出される。
   * 
   * ICE の設定を Websocket を経由して相手に送信する。
   * 
   * @param {*} event 
   * @returns 
   */
  function onIceCandidate(event) { 
    console.log('onIceCandidate')
    console.log(event);
  }
  this.onIceCandidate = onIceCandidate;

  /**
   * 接続先から映像のストリームの追加要求があった場合に呼び出される。
   * @param {*} event 
   */
  function onAddRemoteStream(event) {
    console.log("onAddRemoteStream");
    console.log(event)
  }
  this.onAddRemoteStream = onAddRemoteStream;

  /**
   * 接続先からデータチャンネルの追加要求があった場合に呼び出される。
   * @param {*} event 
   */
  function onDataChannel(event) {
    console.log('onDataChannel');
    console.log(event);
  }
  this.onDataChannel = onDataChannel;

  /**
   * offer を作成します。
   * @returns Promise
   */
  function createOffer() {
    return new Promise(function(resolve, reject) {
      webrtcPeerConnection.createOffer().then((offer) => {
        webrtcPeerConnection.setLocalDescription(offer).then(() => {
          resolve(webrtcPeerConnection.localDescription);
        }).catch(reject);
      }).catch(reject);
    });
  }
  this.createOffer = createOffer;

  /**
   * answer を作成します。
   * @returns Promise
   */
  function createAnswer() {
    return new Promise(function(resolve, reject) {
      webrtcPeerConnection.createAnswer().then((answer) => {
        webrtcPeerConnection.setLocalDescription(answer).then(() => {
          resolve(webrtcPeerConnection.localDescription);
        }).catch(reject);
      }).catch(reject);
    });
  }
  this.createAnswer = createAnswer;

  /**
   * anwser をRTCPeerConnectionに設定します。
   * @param {*} sessionDescription 
   */
  function setAnswer(sessionDescription) {
    const answer = new RTCSessionDescription({
      type : 'answer',
      sdp : sessionDescription.sdp
    });
    webrtcPeerConnection.setRemoteDescription(answer);
  }
  this.setAnswer = setAnswer;

  /**
   * DataChannel を作成します。
   * @param {*} channelName 
   */
  function createDataChannel(channelData) {
    if (!channelData) {
      return;
    }

    let datachannelName = 'datachannel';

    const sendOptions = {
      reliable: true,
      ordered: true,
      negotiated: true,
      id: channelData.sendStreamId
    };

    let sendDataChannel = webrtcPeerConnection.createDataChannel(datachannelName, sendOptions);

    if (channelData.sendStreamId != channelData.recvStreamId) {
      const recvOptions = {
        reliable: true,
        ordered: true,
        negotiated: true,
        id: channelData.recvStreamId
      };
      let recvDataChannel = webrtcPeerConnection.createDataChannel(datachannelName, recvOptions);
      recvDataChannel.binaryType = "arraybuffer";
      recvDataChannel.onmessage = (event) => {
        this.onDataChannel(channelData.playerId, event);
      };
      recvDataChannel.onopen = function (event) {
        console.log("onopen");
        console.log(event);
      };
      recvDataChannel.onclose = function () {
        console.log("onclose");
      };

      let t = {
        sendDataChannel: sendDataChannel,
        recvDataChannel: recvDataChannel
      };
      dataChannels.set('', t);
    } else {
      sendDataChannel.binaryType = "arraybuffer";
      sendDataChannel.onmessage = (event) => {
        this.onDataChannel(channelData.playerId, event);
      };
      sendDataChannel.onopen = function (event) {
        console.log("onopen");
        console.log(event);
      };
      sendDataChannel.onclose = function () {
        console.log("onclose");
      };

      let t = {
        sendDataChannel: sendDataChannel
      };
      dataChannels.set('', t);
    }
  }
  this.createDataChannel = createDataChannel;

  /**
   * 映像を配信します。
   * @param {*} stream 
   * @param {*} configuration 
   * @param {*} reportErrorCB 
   */
  function publishStream(configuration, reportErrorCB) { 
    webrtcConfiguration = configuration;
    reportError = (reportErrorCB != undefined) ? reportErrorCB : function(text) {};

    webrtcPeerConnection = new RTCPeerConnection(webrtcConfiguration);
    webrtcPeerConnection.onconnectionstatechange = this.onConnectionStateChange;
    webrtcPeerConnection.ontrack = this.onAddRemoteStream;
    webrtcPeerConnection.onicecandidate = this.onIceCandidate;
    webrtcPeerConnection.ondatachannel = this.onDataChannel;

    // DataChannel を追加
    dataChannel = webrtcPeerConnection.createDataChannel('cirrus', null);
    dataChannel.onopen = function (event) {
      console.log("onopen");
      console.log(event);
    };
    dataChannel.onclose = function () {
      console.log("onclose");
    };

    // 映像を追加
    const videoTransceiver = webrtcPeerConnection.addTransceiver(stream.getVideoTracks()[0], { streams: [stream] });
    videoTransceiver.receiver.track.enabled = false; 
    videoTransceiver.direction = 'sendonly';

    // 音声を追加
    const audioTransceiver = webrtcPeerConnection.addTransceiver(stream.getAudioTracks()[0]);
    audioTransceiver.receiver.track.enabled = false; 
    audioTransceiver.direction = 'sendonly';
  } 
  this.publishStream  = publishStream;

  /**
   * 映像の配信を停止します。
   */
  function stopStream() {
    destroyWebRTC();
  }
  this.stopStream = stopStream;


  function destroyWebRTC() {
    if (webrtcPeerConnection) {
      if (dataChannel) {
        dataChannel.close()
        dataChannel = null;
      }
      webrtcPeerConnection.close();
      webrtcPeerConnection = null;
    }
  }
};
