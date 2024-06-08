const config = require('./config');
const mediasoup = require('mediasoup_prebuilt');
const mediasoupSdp = require('mediasoup-sdp-bridge');
const MediaWorker = require('./media-worker');

const WORKER_NUM = config.mediasoup.worker.workerNum;

var Room = function(id) {
  this.mediasoupRouter = null;
  this.id = id;
  // ストリーマーの情報を格納します。
  this.streamer = null;
  // UE からの映像受信用の worker を格納します。
  this.mainWorker = null;
  // 転送用の worker を格納します。
  this.transferWorkers = [];
};


Room.prototype.startMediasoup = async function() {
  let worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died. (this should never happen)');
    process.exit(1);
  });

  return worker;
};


Room.prototype.getId = function() {
  return this.id;
};


Room.prototype.getStreamer = function() {
  return this.streamer;
};


Room.prototype.createProducer = async function(msg) {
  console.log('Create producer. [' + this.id + ']');

  const sdp = msg.sdp;

  this.mainWorker = await this.startMediasoup();

  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  this.mediasoupRouter = await this.mainWorker.createRouter({ mediaCodecs });
  
  const transport = await this.createWebRtcTransport("Streamer");
  const sdpEndpoint = await mediasoupSdp.createSdpEndpoint(transport, this.mediasoupRouter.rtpCapabilities);
  const producers = await sdpEndpoint.processOffer(sdp);
  const sdpAnswer = sdpEndpoint.createAnswer();
  const answer = { type: "answer", playerId: msg.playerId, sceneId: this.id, sdp: sdpAnswer };
  this.streamer = { transport: transport, producers: producers, nextDataStreamId: 0 };

  for (let i = 0; i < WORKER_NUM; i++) {
    this.transferWorkers[i] = new MediaWorker.MediaWorker(this.mediasoupRouter, this.id);
  }

  for (let worker of this.transferWorkers) {
   await worker.createProducer(producers, this.streamer);
  }

  return answer;
};


Room.prototype.deleteProducer = function() {
  console.log('Delete producer. [' + this.id + ']');

  if (this.streamer) {
    for (const mediaProducer of this.streamer.producers) {
      mediaProducer.close();
    }
    this.streamer.producers = [];

    if (this.streamer.transport) {
      this.streamer.transport.close();
      this.streamer.transport = null;
    }
    this.streamer = null;
  }

  for (let worker of this.transferWorkers) {
    worker.deleteProducer();
  }
  this.transferWorkers = [];

  if (this.mediasoupRouter) {
    this.mediasoupRouter.close();
    this.mediasoupRouter = null;
  }

  if (this.mainWorker) {
    this.mainWorker.close();
    this.mainWorker = null;
  }
};


Room.prototype.createConsumer = async function(msg) {
  if (this.streamer == null) {
    console.log("No streamer connected, ignoring player.");
    return undefined;
  }

  try {
    const workerId = parseInt(msg.playerId) % WORKER_NUM;
    return this.transferWorkers[workerId].createConsumer(msg);
  } catch(err) {
    console.error("transport.consume() failed:", msg, err);
    return undefined;
  }
};


Room.prototype.onAnswer = async function(msg) {
  try {
    const workerId = parseInt(msg.playerId) % WORKER_NUM;
    await this.transferWorkers[workerId].onAnswer(msg);
  } catch (err) {
    console.error("consumer.sdpEndpoint.processAnswer() failed:", msg, err);
  }
};


Room.prototype.deleteConsumer = function(playerId) {
  try {
    if (playerId) {
      const workerId = parseInt(playerId) % WORKER_NUM;
      this.transferWorkers[workerId].deleteConsumer(playerId);
    }
  } catch (err) {
    console.error("deleteConsumer() failed: playerId=" + playerId, err);
  }
};


Room.prototype.deleteAllConsumer = function() {
  try {
    for (let worker of this.transferWorkers) {
      worker.deleteAllConsumer();
    }
  } catch (err) {
    console.error("deleteConsumer() failed:", err);
  }
};


Room.prototype.setupPeerDataChannels = async function(msg) {
  try {
    const workerId = parseInt(msg.playerId) % WORKER_NUM;
    var { peerSignal, streamerSignal } = await this.transferWorkers[workerId].setupPeerDataChannels(msg);
    // 1023 は、UE アプリとの接続で使用していますので、ここで制限を行っています。
    // ここを修正する場合には、Streamer.cpp の修正も同時に行うこと。
    if (streamerSignal.recvStreamId == 1023) {
      await this.transferWorkers[workerId].tearDownPeerDataChannels(msg);
      return await this.transferWorkers[workerId].setupPeerDataChannels(msg);
    }
    return {
      peerSignal: peerSignal,
      streamerSignal: streamerSignal
    } 
  } catch (err) {
    console.error("setupPeerDataChannels() failed:", msg, err);
  }
  return {
    peerSignal: undefined,
    streamerSignal: undefined
  }
};


Room.prototype.tearDownPeerDataChannels = async function(msg) {
  try {
    const workerId = parseInt(msg.playerId) % WORKER_NUM;
    return await this.transferWorkers[workerId].closePeerDataChannel(msg);
  } catch (err) {
    console.error("tearDownPeerDataChannels() failed:", msg, err);
  }
  return null;
};

Room.prototype.createWebRtcTransport = async function() {
  const {
    listenIps,
    initialAvailableOutgoingBitrate
  } = config.mediasoup.webRtcTransport;

  const transport = await this.mediasoupRouter.createWebRtcTransport({
    listenIps: listenIps,
    enableUdp: true,
    enableTcp: false,
    preferUdp: true,
    enableSctp: true, // datachannels
    initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate
  });

  transport.on("icestatechange", (iceState) => { console.log("%s ICE state changed to %s", identifier, iceState); });
  transport.on("iceselectedtuplechange", (iceTuple) => { console.log("%s ICE selected tuple %s", identifier, JSON.stringify(iceTuple)); });
  transport.on("sctpstatechange", (sctpState) => { console.log("%s SCTP state changed to %s", identifier, sctpState); });

  return transport;
};


exports.Room = Room;
