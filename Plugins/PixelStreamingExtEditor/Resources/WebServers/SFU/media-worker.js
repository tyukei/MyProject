const config = require('./config');
const mediasoup = require('mediasoup_prebuilt');
const mediasoupSdp = require('mediasoup-sdp-bridge');


let MediaWorker = function(sourceMediasoupRouter, id) {
  this.id = id;
  this.worker = null;
  this.sourceMediasoupRouter = sourceMediasoupRouter;
  this.mediasoupRouter = null;
  this.producers = null;
  this.streamer = null;
  this.peers = new Map();
};


MediaWorker.prototype.createProducer = async function(producers, streamer) {
  console.log('Create MediaWorkers producer.');

  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  this.worker = await this.createMediasoupWorker();
  this.mediasoupRouter = await this.worker.createRouter({ mediaCodecs });
  this.producers = producers;
  for (let producer of producers) {
    await this.sourceMediasoupRouter.pipeToRouter({
      producerId: producer.id,
      router: this.mediasoupRouter
    });
  }
  this.streamer = streamer;
};


MediaWorker.prototype.deleteProducer = function() {
  console.log('Delete producer.');

  this.deleteAllConsumer();

  if (this.mediasoupRouter) {
    this.mediasoupRouter.close();
    this.mediasoupRouter = null;
  }

  if (this.worker) {
    this.worker.close();
    this.worker = null;
  }
};


MediaWorker.prototype.createConsumer = async function(msg) {
  try {
    console.log('Create consumer. sceneId=' + this.id + ' playerId=' + msg.playerId);

    const peerId = '' + msg.playerId;
    const transport = await this.createWebRtcTransport("Peer " + peerId);
    const sdpEndpoint = mediasoupSdp.createSdpEndpoint( transport, this.mediasoupRouter.rtpCapabilities );
    sdpEndpoint.addConsumeData(); // adds the sctp 'application' section to the offer

    // media consumers
    let consumers = [];
    for (const mediaProducer of this.producers) {
      const consumer = await transport.consume({ producerId: mediaProducer.id, rtpCapabilities: this.mediasoupRouter.rtpCapabilities });
      consumer.observer.on("layerschange", function() { console.log("layer changed!", consumer.currentLayers); });
      sdpEndpoint.addConsumer(consumer);
      consumers.push(consumer);
    }

    const offerSignal = {
      type: "offer",
      playerId: peerId,
      sceneId: this.id,
      sdp: sdpEndpoint.createOffer(),
      sfu: true // indicate we're offering from sfu
    };

    const newPeer = {
      id: peerId,
      transport: transport,
      sdpEndpoint: sdpEndpoint,
      consumers: consumers
    };

    // add the new peer
    this.peers.set(peerId, newPeer);

    return offerSignal;
  } catch(err) {
    console.error("transport.consume() failed:", err);
    return undefined;
  }
};


MediaWorker.prototype.onAnswer = async function(msg) {
  let consumer = this.peers.get('' + msg.playerId);
  if (!consumer) {
    console.log(`Unable to find player ${msg.playerId}`);
  } else {
    await consumer.sdpEndpoint.processAnswer(msg.sdp);
  }
};


MediaWorker.prototype.deleteConsumer = function(playerId) {
  let peer = this.peers.get('' + playerId);
  if (peer) {
    console.log('Delete consumer. sceneId=' + this.id + ' playerId=' + playerId);

    // 映像・音声の consumer を削除
    for (let consumer of peer.consumers) {
      consumer.close();
    }
    peer.consumers = [];

    // データチャンネルの削除
    this.closePeerDataChannel(peer);

    if (peer.transport) {
      peer.transport.close();
      peer.transport = null;
    }
  }

  // ユーザを削除
  this.peers.delete('' + playerId);
};


MediaWorker.prototype.deleteAllConsumer = function() {
  this.peers.forEach((value, key) => {
    this.deleteConsumer(key);
  });
};


MediaWorker.prototype.setupPeerDataChannels = async function(msg) {
  let peerId = '' + msg.playerId;
  const peer = this.peers.get(peerId);
  if (peer) {
    const streamerDataProducerId = this.getNextDataProducerId();
    const peerDataProducerId = 1;
    if (streamerDataProducerId != -1) {
      try {
        // streamer data producer
        peer.streamerDataProducer = await this.streamer.transport.produceData({
          label: 'datachannel', 
          sctpStreamParameters: {
            streamId: streamerDataProducerId, 
            ordered: true
          }
        });

        peer.streamerPipeToRouterResult = await this.sourceMediasoupRouter.pipeToRouter({
          dataProducerId: peer.streamerDataProducer.id,
          router: this.mediasoupRouter
        });

        // peer data consumer
        peer.peerDataConsumer = await peer.transport.consumeData({
          dataProducerId: peer.streamerDataProducer.id
        });

        // peer data producer
        peer.peerDataProducer = await peer.transport.produceData({
          label: 'datachannel',
          sctpStreamParameters: {
            streamId: peerDataProducerId, 
            ordered: true
          }
        });

        peer.peerPipeToRouterResult = await this.mediasoupRouter.pipeToRouter({
          dataProducerId: peer.peerDataProducer.id,
          router: this.sourceMediasoupRouter
        });

        // streamer data consumer
        peer.streamerDataConsumer = await this.streamer.transport.consumeData({
          dataProducerId: peer.peerDataProducer.id
        });

        const peerSignal = {
          type: 'peerDataChannels',
          playerId: peerId,
          sceneId: this.id,
          sendStreamId: peer.peerDataProducer.sctpStreamParameters.streamId,
          recvStreamId: peer.peerDataConsumer.sctpStreamParameters.streamId
        };

        const streamerSignal = {
          type: "streamerDataChannels",
          playerId: peerId,
          sceneId: this.id,
          sendStreamId: peer.streamerDataProducer.sctpStreamParameters.streamId,
          recvStreamId: peer.streamerDataConsumer.sctpStreamParameters.streamId
        };

        console.log('peerDataChannels sendStreamId=' + peer.peerDataProducer.sctpStreamParameters.streamId
            + ', recvStreamId=' + peer.peerDataConsumer.sctpStreamParameters.streamId);
        console.log('streamerDataChannels sendStreamId=' + peer.streamerDataProducer.sctpStreamParameters.streamId
            + ', recvStreamId=' + peer.streamerDataConsumer.sctpStreamParameters.streamId);

        return {
          peerSignal: peerSignal,
          streamerSignal: streamerSignal
        }
      } catch(err) {
        console.log('Failed to create a dataProducer or dataConsumer.[' + this.id
            + '] streamerDataProducerId=' + streamerDataProducerId, err);
        this.closePeerDataChannel(peer);
        this.streamer.dataStreamIds[streamerDataProducerId] = 0;
        this.streamer.nextDataStreamId = streamerDataProducerId; 
      }
    } else {
      console.log('Failed to create streamerDataProducerId. [' + this.id + ']');
      this.closePeerDataChannel(peer);
    }
  } else {
    console.log('Not found peer. [' + this.id + ']');
  }
  return {
    peerSignal: undefined,
    streamerSignal: undefined
  }
};

MediaWorker.prototype.closePeerDataChannel = function(peer) {
  console.log('Close DataChannel. playerId=' + peer.id + ' sceneId=' + this.id);

  // クライアント側の DataChannel を削除
  if (peer.peerDataConsumer) {
    peer.peerDataConsumer.close();
    peer.peerDataConsumer = null;
  }

  if (peer.streamerPipeToRouterResult) {
    if (peer.streamerPipeToRouterResult.pipeDataConsumer) {
      peer.streamerPipeToRouterResult.pipeDataConsumer.close();
      peer.streamerPipeToRouterResult.pipeDataConsumer = null;
    }

    if (peer.streamerPipeToRouterResult.pipeDataProducer) {
      peer.streamerPipeToRouterResult.pipeDataProducer.close();
      peer.streamerPipeToRouterResult.pipeDataProducer = null;
    }
  }

  if (peer.peerDataProducer) {
    peer.peerDataProducer.close();
    peer.peerDataProducer = null;
  }

  // UE 側の DataChannel を削除
  if (peer.streamerDataConsumer) {
    peer.streamerDataConsumer.close();
    peer.streamerDataConsumer = null;
  }

  if (peer.peerPipeToRouterResult) {
    if (peer.peerPipeToRouterResult.pipeDataConsumer) {
      peer.peerPipeToRouterResult.pipeDataConsumer.close();
      peer.peerPipeToRouterResult.pipeDataConsumer = null;
    }

    if (peer.peerPipeToRouterResult.pipeDataProducer) {
      peer.peerPipeToRouterResult.pipeDataProducer.close();
      peer.peerPipeToRouterResult.pipeDataProducer = null;
    }
  }

  if (peer.streamerDataProducer) {
    let sctpStreamId = peer.streamerDataProducer.sctpStreamParameters.streamId;
    this.streamer.dataStreamIds[sctpStreamId] = 0;
    peer.streamerDataProducer.close();
    peer.streamerDataProducer = null;
  }
};


// ストリームIDの使い回しをどうにかしないといけない。
MediaWorker.prototype.getNextDataProducerId = function() {
  if (!this.streamer.transport.sctpParameters || typeof this.streamer.transport.sctpParameters.MIS !== 'number') {
    throw new TypeError('missing streamer.transport.sctpParameters.MIS');
  }
  const numStreams = this.streamer.transport.sctpParameters.MIS;
  if (!this.streamer.dataStreamIds) {
    this.streamer.dataStreamIds = Buffer.alloc(numStreams, 0);
  }

  let sctpStreamId;
  for (let idx = 0; idx < numStreams; ++idx) {
    sctpStreamId = (this.streamer.nextDataStreamId + idx) % numStreams;
    if (!this.streamer.dataStreamIds[sctpStreamId]) {
      this.streamer.dataStreamIds[sctpStreamId] = 1;
      this.streamer.nextDataStreamId = sctpStreamId + 1;
      return sctpStreamId;
    }
  }
  console.log("no available data streams on streamer.");
  return -1;
};


MediaWorker.prototype.tearDownPeerDataChannels = function(msg) {
  let peerId = '' + msg.playerId;
  let peer = this.peers.get(peerId);
  if (peer) {
    this.closePeerDataChannel(peer);
    
    return {
      type: "streamerDataChannelsClosed",
      playerId: peerId,
      sceneId: this.id
    };
  }

  return null;
};


MediaWorker.prototype.createWebRtcTransport = async function() {
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

MediaWorker.prototype.createMediasoupWorker = async function () {
  let worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died (this should never happen)');
    process.exit(1);
  });
  return worker;
}


exports.MediaWorker = MediaWorker;
