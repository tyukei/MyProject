'use strict';

import { MessageType } from "./message-type.js";
import { CameraMode } from "./camera-mode.js";

// webrtc-player の個数を定義
const MAX_WEBRTC_PLAYER = 2;

export class WebRTCPlayer {
  constructor (sceneId, parOptions, useDataChannel, cameraMode) {
    this.parOptions = typeof parOptions !== 'undefined' ? parOptions : {};
    this.sceneId = '' + sceneId;
    this.videoVisibility = false;
    this.videoDelay = 300;
    this.cameraMode = cameraMode;

    const urlParams = new URLSearchParams(window.location.search);

    //**********************
    // Config setup
    //**********************
    this.cfg = typeof parOptions.peerConnectionOptions !== 'undefined' ? parOptions.peerConnectionOptions : {};
    this.cfg.sdpSemantics = 'unified-plan';

    // this.cfg.rtcAudioJitterBufferMaxPackets = 10;
    // this.cfg.rtcAudioJitterBufferFastAccelerate = true;
    // this.cfg.rtcAudioJitterBufferMinDelayMs = 0;

    // If this is true in Chrome 89+ SDP is sent that is incompatible with UE Pixel Streaming 4.26 and below.
    // However 4.27 Pixel Streaming does not need this set to false as it supports `offerExtmapAllowMixed`.
    // tdlr; uncomment this line for older versions of Pixel Streaming that need Chrome 89+.
    this.cfg.offerExtmapAllowMixed = false;

    this.forceTURN = urlParams.has('ForceTURN');
    if (this.forceTURN) {
      console.log("Forcing TURN usage by setting ICE Transport Policy in peer connection config.");
      this.cfg.iceTransportPolicy = "relay";
    }

    this.forceMonoAudio = urlParams.has('ForceMonoAudio');
    if (this.forceMonoAudio){
      console.log("Will attempt to force mono audio by munging the sdp in the browser.")
    }

    this.cfg.bundlePolicy = "balanced";
    this.forceMaxBundle = urlParams.has('ForceMaxBundle');
    if (this.forceMaxBundle) {
      this.cfg.bundlePolicy = "max-bundle";
    }

    //**********************
    // Variables
    //**********************
    this.pcClient = null;
    this.sendDataChannel = null;
    this.recvDataChannel = null;
    this.useDataChannel = useDataChannel;
    // 映像と DataChannel の接続フラグ
    this.isDataChannelConnected = false;
    this.isVideoConnected = false;

    this.sdpConstraints = {
      offerToReceiveAudio: 1, //Note: if you don't need audio you can get improved latency by turning this off.
      offerToReceiveVideo: 1,
      voiceActivityDetection: false
    };

    // See https://www.w3.org/TR/webrtc/#dom-rtcdatachannelinit for values (this is needed for Firefox to be consistent with Chrome.)
    this.dataChannelOptions = { ordered: true };

    // This is useful if the video/audio needs to autoplay (without user input) as browsers do not allow autoplay non-muted of sound sources without user interaction.
    this.startVideoMuted = typeof parOptions.startVideoMuted !== 'undefined' ? parOptions.startVideoMuted : true;
    this.autoPlayAudio = typeof parOptions.autoPlayAudio !== 'undefined' ? parOptions.autoPlayAudio : true;

    // To enable mic in browser use SSL/localhost and have ?useMic in the query string.
    this.useMic = urlParams.has('useMic');
    if (!this.useMic) {
      console.log("Microphone access is not enabled. Pass ?useMic in the url to enable it.");
    }

    // When ?useMic check for SSL or localhost
    let isLocalhostConnection = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    let isHttpsConnection = location.protocol === 'https:';
    if (this.useMic && !isLocalhostConnection && !isHttpsConnection) {
      this.useMic = false;
      console.error("Microphone access in the browser will not work if you are not on HTTPS or localhost. Disabling mic access.");
      console.error("For testing you can enable HTTP microphone access Chrome by visiting chrome://flags/ and enabling 'unsafely-treat-insecure-origin-as-secure'");
    }

    // Prefer SFU or P2P connection
    this.preferSFU = urlParams.has('preferSFU');
    console.log(this.preferSFU ? 
        "The browser will signal it would prefer an SFU connection. Remove ?preferSFU from the url to signal for P2P usage." :
        "The browser will signal for a P2P connection. Pass ?preferSFU in the url to signal for SFU usage.");

    // Latency tester
    this.latencyTestTimings =  {
      TestStartTimeMs: null,
      UEReceiptTimeMs: null,
      UEEncodeMs: null,
      UECaptureToSendMs: null,
      UETransmissionTimeMs: null,
      BrowserReceiptTimeMs: null,
      FrameDisplayDeltaTimeMs: null,
      Reset: () => {
        this.TestStartTimeMs = null;
        this.UEReceiptTimeMs = null;
        this.UEEncodeMs = null,
        this.UECaptureToSendMs = null,
        this.UETransmissionTimeMs = null;
        this.BrowserReceiptTimeMs = null;
        this.FrameDisplayDeltaTimeMs = null;
      },
      SetUETimings: (UETimings) => {
        this.UEReceiptTimeMs = UETimings.ReceiptTimeMs;
        this.UEEncodeMs = UETimings.EncodeMs,
        this.UECaptureToSendMs = UETimings.CaptureToSendMs,
        this.UETransmissionTimeMs = UETimings.TransmissionTimeMs;
        this.BrowserReceiptTimeMs = Date.now();
        this.OnAllLatencyTimingsReady(this);
      },
      SetFrameDisplayDeltaTime: (DeltaTimeMs) => {
        if (this.FrameDisplayDeltaTimeMs == null) {
          this.FrameDisplayDeltaTimeMs = Math.round(DeltaTimeMs);
          this.OnAllLatencyTimingsReady(this);
        }
      },
    }

    let container = document.getElementById('video-container');
    if (!container) {
      return;
    }

    this.video = this.createWebRtcVideo();
    this.availableVideoStreams = new Map();
  }
  
  OnAllLatencyTimingsReady(Timings) {
  }

  //**********************
  // Functions
  //**********************

  // 使用していない Video を取得します。
  getUnusedVideoElement() {
    for (let i = 0; i < MAX_WEBRTC_PLAYER; i++) {
      let video = document.getElementById('webrtc-player' + i);
      if (video && video.style.display !== 'inline-block') {
        return video
      }
    }
    return null;
  }

  //Create Video element and expose that as a parameter
  createWebRtcVideo () {
    let video = this.getUnusedVideoElement();
    if (!video) {
      return null;
    }
    // video.id = this.sceneId;
    video.classList.add('webrtc-player');
    video.style.display = 'none';
    video.playsInline = true;
    video.disablePictureInPicture = true;
    // 映像を読み込むときは、最初ミュートを ON にしておきます。
    // 映像が表示されるときにミュートを OFF にします。
    video.muted = true;
    // 映像は非表示なるように設定しておきます。
    this.videoVisibility = false;

    let onLoadedMetaData = () => {
      if (typeof(this.onVideoInitialised) == 'function') {
        this.onVideoInitialised();
      }
      video.removeEventListener("loadedmetadata", onLoadedMetaData);
    };
    video.addEventListener("loadedmetadata", onLoadedMetaData);

    let onPlaying = () => {
      // 映像が切り替わってから少し置いてから切り替えないと映像が最初の間静止画になってしまう。
      setTimeout(() => {
        this.isVideoConnected = true;
        this.notifyVideoPlaying(video);
      }, this.videoDelay);
      video.removeEventListener("playing", onPlaying);
    };
    video.addEventListener("playing", onPlaying);

    // Check if request video frame callback is supported
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      // The API is supported! 
      const onVideoFrameReady = (now, metadata) => {
        if (metadata.receiveTime && metadata.expectedDisplayTime) {
          const receiveToCompositeMs = metadata.presentationTime - metadata.receiveTime;
          if (this.aggregatedStats) {
            this.aggregatedStats.receiveToCompositeMs = receiveToCompositeMs;
          }
        }
        // Re-register the callback to be notified about the next frame.
        video.requestVideoFrameCallback(onVideoFrameReady);
      };
      // Initially register the callback to be notified about the first frame.
      video.requestVideoFrameCallback(onVideoFrameReady);
    }
    
    return video;
  }

  notifyVideoPlaying(video) {
    if (this.isConnected() && typeof(this.onVideoPlaying) == 'function') {
      this.onVideoPlaying(video);
    }
  }

  onsignalingstatechange(state) {
    console.info('Signaling state change. |', state.srcElement.signalingState, "|");
  }

  oniceconnectionstatechange(state) {
    console.info('Browser ICE connection |', state.srcElement.iceConnectionState, '|');

    if (this.pcClient) {
      switch (this.pcClient.iceConnectionState) {
        case 'closed':
        case 'failed':
        case 'disconnected':
          if (typeof(this.onIceDisconnected) == 'function') {
            this.onIceDisconnected();
          }
          break;
      }
    }
  }

  onicegatheringstatechange(state) {
    console.info('Browser ICE gathering |', state.srcElement.iceGatheringState, '|');
  }

  handleOnTrack(e) {
    if (e.track) {
        console.log('Got track. | Kind=' + e.track.kind + ' | Id=' + e.track.id + ' | readyState=' + e.track.readyState + ' |'); 
    }
    
    if (e.track.kind == "audio") {
      this.handleOnAudioTrack(e.streams[0]);
    } else if (e.track.kind == "video") {
      for (const s of e.streams) {
        if (!this.availableVideoStreams.has(s.id)) {
          this.availableVideoStreams.set(s.id, s);
        }
      }

      this.video.srcObject = e.streams[0];

      // All tracks are added "muted" by WebRTC/browser and become unmuted when media is being sent
      e.track.onunmute = () => {
        this.video.srcObject = e.streams[0];
        this.onNewVideoTrack(e.streams);
      }
    }
  }

  handleOnAudioTrack(audioMediaStream) {
    // do nothing the video has the same media stream as the audio track we have here (they are linked)
    if (this.video.srcObject == audioMediaStream) {
      return;
    }
    // video element has some other media stream that is not associated with this audio track
    else if (this.video.srcObject && this.video.srcObject !== audioMediaStream) {
      // create a new audio element
      let audioElem = document.createElement("Audio");
      audioElem.srcObject = audioMediaStream;

      // there is no way to autoplay audio (even muted), so we defer audio until first click
      if (!this.autoPlayAudio) {
        let clickToPlayAudio = function() {
          audioElem.play();
          this.video.removeEventListener("click", clickToPlayAudio);
        };

        this.video.addEventListener("click", clickToPlayAudio);
      }
      // we assume the user has clicked somewhere on the page and autoplaying audio will work
      else {
        audioElem.play();
      }
      console.log('Created new audio element to play seperate audio stream.');
    }
  }

  onDataChannel(dataChannelEvent) {
    // This is the primary data channel code path when we are "receiving"
    console.log("Data channel created for us by browser as we are a receiving peer.");
    this.sendDataChannel = dataChannelEvent.channel;
    this.setupDataChannelCallbacks(this.sendDataChannel);
  }

  createDataChannel(pc, label, options) {
    // This is the primary data channel code path when we are "offering"
    let datachannel = pc.createDataChannel(label, options);
    console.log(`Created datachannel (${label})`);
    this.setupDataChannelCallbacks(datachannel);
    return datachannel;
  }

  setupDataChannelCallbacks(datachannel) {
    try {
      // Inform browser we would like binary data as an ArrayBuffer (FF chooses Blob by default!)
      datachannel.binaryType = "arraybuffer";

      datachannel.onopen = (e) => {
        console.log("Data channel connected", e);

        if (typeof(this.onDataChannelConnected) == 'function') {
          this.onDataChannelConnected();
        }

        this.isDataChannelConnected = true;
        if (this.cameraMode == CameraMode.Fixed_AI ||
            this.cameraMode == CameraMode.ThirdPerson_AI) {
          this.isVideoConnected = true;
          setTimeout(() => {
            this.notifyVideoPlaying();
          }, 1000);
        } else {
          this.notifyVideoPlaying();
        }
      }

      datachannel.onclose = (e) => {
        console.log("Data channel disconnected", e);
      }

      datachannel.onmessage = (e) => {
        if (this.videoVisibility && typeof(this.onDataChannelMessage) == 'function') {
          this.onDataChannelMessage(e.data);
        }
      };

      datachannel.onerror = (e) => {
        console.error("Data channel error", e);
      }

      return datachannel;
    } catch (e) { 
      console.warn('No data channel', e);
      return null;
    }
  }

  onicecandidate(e) {
    let candidate = e.candidate;
    if (candidate && candidate.candidate) {
      this.onWebRtcCandidate(candidate);
    }
  }

  handleCreateOffer(pc) {
    pc.createOffer(this.sdpConstraints).then((offer) => {
      // Munging is where we modifying the sdp string to set parameters that are not exposed to the browser's WebRTC API
      this.mungeSDP(offer);
      // Set our munged SDP on the local peer connection so it is "set" and will be send across
      pc.setLocalDescription(offer);
      if (this.onWebRtcOffer) {
        this.onWebRtcOffer(offer);
      }
    },
    function () { console.warn("Couldn't create offer") });
  }

  mungeSDP(offer) {
    let audioSDP = '';
    // set max bitrate to highest bitrate Opus supports
    audioSDP += 'maxaveragebitrate=510000;';
    if (this.useMic) {
      // set the max capture rate to 48khz (so we can send high quality audio from mic)
      audioSDP += 'sprop-maxcapturerate=48000;';
    }
    // Force mono or stereo based on whether ?forceMono was passed or not
    audioSDP += this.forceMonoAudio ? 'sprop-stereo=0;stereo=0;' : 'sprop-stereo=1;stereo=1;';
    // enable in-band forward error correction for opus audio
    audioSDP += 'useinbandfec=1';
    // We use the line 'useinbandfec=1' (which Opus uses) to set our Opus specific audio parameters.
    offer.sdp = offer.sdp.replace('useinbandfec=1', audioSDP);
  }
  
  setupPeerConnection (pc) {
    // Setup peerConnection events
    pc.onsignalingstatechange = this.onsignalingstatechange.bind(this);
    pc.oniceconnectionstatechange = this.oniceconnectionstatechange.bind(this);
    pc.onicegatheringstatechange = this.onicegatheringstatechange.bind(this);
    pc.ontrack = this.handleOnTrack.bind(this);
    pc.onicecandidate = this.onicecandidate.bind(this);
    pc.ondatachannel = this.onDataChannel.bind(this);
  }

  generateAggregatedStatsFunction() {
    if (!this.aggregatedStats) {
      this.aggregatedStats = {};
    }

    return (stats) => {
      let newStat = {};
      
      newStat.sceneId = this.sceneId;
      
      stats.forEach(stat => {
        if (stat.type == 'inbound-rtp' 
            && !stat.isRemote 
            && (stat.mediaType == 'video' || stat.id.toLowerCase().includes('video'))) {

          newStat.timestamp = stat.timestamp;
          newStat.bytesReceived = stat.bytesReceived;
          newStat.framesDecoded = stat.framesDecoded;
          newStat.packetsLost = stat.packetsLost;
          newStat.bytesReceivedStart = this.aggregatedStats && this.aggregatedStats.bytesReceivedStart ? this.aggregatedStats.bytesReceivedStart : stat.bytesReceived;
          newStat.framesDecodedStart = this.aggregatedStats && this.aggregatedStats.framesDecodedStart ? this.aggregatedStats.framesDecodedStart : stat.framesDecoded;
          newStat.timestampStart = this.aggregatedStats && this.aggregatedStats.timestampStart ? this.aggregatedStats.timestampStart : stat.timestamp;

          if (this.aggregatedStats && this.aggregatedStats.timestamp) {
            if (this.aggregatedStats.bytesReceived) {
              // bitrate = bits received since last time / number of ms since last time
              // This is automatically in kbits (where k=1000) since time is in ms and stat we want is in seconds (so a '* 1000' then a '/ 1000' would negate each other)
              newStat.bitrate = 8 * (newStat.bytesReceived - this.aggregatedStats.bytesReceived) / (newStat.timestamp - this.aggregatedStats.timestamp);
              newStat.bitrate = Math.floor(newStat.bitrate);
              newStat.lowBitrate = this.aggregatedStats.lowBitrate && this.aggregatedStats.lowBitrate < newStat.bitrate ? this.aggregatedStats.lowBitrate : newStat.bitrate
              newStat.highBitrate = this.aggregatedStats.highBitrate && this.aggregatedStats.highBitrate > newStat.bitrate ? this.aggregatedStats.highBitrate : newStat.bitrate
            }

            if (this.aggregatedStats.bytesReceivedStart) {
              newStat.avgBitrate = 8 * (newStat.bytesReceived - this.aggregatedStats.bytesReceivedStart) / (newStat.timestamp - this.aggregatedStats.timestampStart);
              newStat.avgBitrate = Math.floor(newStat.avgBitrate);
            }

            if (this.aggregatedStats.framesDecoded) {
              // framerate = frames decoded since last time / number of seconds since last time
              newStat.framerate = (newStat.framesDecoded - this.aggregatedStats.framesDecoded) / ((newStat.timestamp - this.aggregatedStats.timestamp) / 1000);
              newStat.framerate = Math.floor(newStat.framerate);
              newStat.lowFramerate = this.aggregatedStats.lowFramerate && this.aggregatedStats.lowFramerate < newStat.framerate ? this.aggregatedStats.lowFramerate : newStat.framerate
              newStat.highFramerate = this.aggregatedStats.highFramerate && this.aggregatedStats.highFramerate > newStat.framerate ? this.aggregatedStats.highFramerate : newStat.framerate
            }

            if (this.aggregatedStats.framesDecodedStart) {
              newStat.avgframerate = (newStat.framesDecoded - this.aggregatedStats.framesDecodedStart) / ((newStat.timestamp - this.aggregatedStats.timestampStart) / 1000);
              newStat.avgframerate = Math.floor(newStat.avgframerate);
            }
          }
        }

        // Read video track stats
        if (stat.type == 'track' && (stat.trackIdentifier == 'video_label' || stat.kind == 'video')) {
          newStat.framesDropped = stat.framesDropped;
          newStat.framesReceived = stat.framesReceived;
          newStat.framesDroppedPercentage = stat.framesDropped / stat.framesReceived * 100;
          newStat.frameHeight = stat.frameHeight;
          newStat.frameWidth = stat.frameWidth;
          newStat.frameHeightStart = this.aggregatedStats && this.aggregatedStats.frameHeightStart ? this.aggregatedStats.frameHeightStart : stat.frameHeight;
          newStat.frameWidthStart = this.aggregatedStats && this.aggregatedStats.frameWidthStart ? this.aggregatedStats.frameWidthStart : stat.frameWidth;
        }

        if (stat.type =='candidate-pair' && stat.hasOwnProperty('currentRoundTripTime') && stat.currentRoundTripTime != 0) {
          newStat.currentRoundTripTime = stat.currentRoundTripTime;
        }
      });

      if (this.aggregatedStats.receiveToCompositeMs) {
        newStat.receiveToCompositeMs = this.aggregatedStats.receiveToCompositeMs;
        this.latencyTestTimings.SetFrameDisplayDeltaTime(this.aggregatedStats.receiveToCompositeMs);
      }
      
      this.aggregatedStats = newStat;

      if (this.onAggregatedStats) {
        this.onAggregatedStats(newStat)
      }
    }
  };

  async setupTransceiversAsync(pc) {
    let hasTransceivers = pc.getTransceivers().length > 0;

    // Setup a transceiver for getting UE video
    pc.addTransceiver("video", { direction: "recvonly" });

    // Setup a transceiver for sending mic audio to UE and receiving audio from UE
    if (!this.useMic) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    } else {
      let audioSendOptions = this.useMic ? {
        autoGainControl: false,
        channelCount: 1,
        echoCancellation: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 48000,
        sampleSize: 16,
        volume: 1.0
      } : false;

      // Note using mic on android chrome requires SSL or chrome://flags/ "unsafely-treat-insecure-origin-as-secure"
      const stream = await navigator.mediaDevices.getUserMedia({video: false, audio: audioSendOptions});
      if (stream) {
        if (hasTransceivers) {
          for (let transceiver of pc.getTransceivers()) {
            if (transceiver && transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === "audio") {
              for (const track of stream.getTracks()) {
                if (track.kind && track.kind == "audio") {
                  transceiver.sender.replaceTrack(track);
                  transceiver.direction = "sendrecv";
                }
              }
            }
          }
        } else {
          for (const track of stream.getTracks()) {
            if (track.kind && track.kind == "audio") {
              pc.addTransceiver(track, { direction: "sendrecv" });
            }
          }
        }
      } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }
    }
  };


  //**********************
  // Public functions
  //**********************

  
  setVideoVisibility(visibility) {
    if (this.video) {
      this.videoVisibility = visibility;

      if (visibility) {
        this.video.style.display = 'inline-block';
      } else {
        this.video.style.display = 'none';
      }
    }
  }

  setVideoMuted(muted) {
    if (this.video) {
      this.video.muted = muted;
    }
  }

  setVideoEnabled(enabled) {
    if (this.video && this.video.srcObject) {
      let videoTracks = this.video.srcObject.getTracks();
      if (videoTracks) {
        videoTracks.forEach((track) => track.enabled = enabled);
      }
    }
  }

  startLatencyTest(onTestStarted) {
    // Can't start latency test without a video element
    if (!this.video) {
        return;
    }

    this.latencyTestTimings.Reset();
    this.latencyTestTimings.TestStartTimeMs = Date.now();
    onTestStarted(this.latencyTestTimings.TestStartTimeMs);
  }

  // This is called when revceiving new ice candidates individually instead of part of the offer
  handleCandidateFromServer(iceCandidate) {
    let candidate = new RTCIceCandidate(iceCandidate);
      // if forcing TURN, reject any candidates not relay
      if (this.forceTURN) {
          // check if no relay address is found, if so, we are assuming it means no TURN server
          if (candidate.candidate.indexOf("relay") < 0) { 
            console.warn("Dropping candidate because it was not TURN relay.", "| Type=", 
              candidate.type, "| Protocol=", candidate.protocol, "| Address=", 
              candidate.address, "| Port=", candidate.port, "|")
            return;
          }
      }
      this.pcClient.addIceCandidate(candidate).catch((e) => {
        console.error("Failed to add ICE candidate", e);
      });
  };

  // Called externaly to create an offer for the server
  createOffer() {
    if (this.pcClient) {
      console.log("Closing existing PeerConnection")
      this.pcClient.close();
      this.pcClient = null;
    }
    this.pcClient = new RTCPeerConnection(this.cfg);
    this.setupPeerConnection(this.pcClient);
    this.setupTransceiversAsync(this.pcClient).finally(() => {
      this.sendDataChannel = this.createDataChannel(this.pcClient, 'cirrus', this.dataChannelOptions);
      this.handleCreateOffer(this.pcClient);
    });
  };

  // Called externaly when an offer is received from the server
  receiveOffer(offer) {
    if (!this.pcClient) {
      console.log("Creating a new PeerConnection in the browser.");
      this.pcClient = new RTCPeerConnection(this.cfg);
      this.setupPeerConnection(this.pcClient);

      // Put things here that happen post transceiver setup
      this.pcClient.setRemoteDescription(offer).then(() => {
        this.setupTransceiversAsync(this.pcClient).finally(() => {
          this.pcClient.createAnswer().then((answer) => {
            this.mungeSDP(answer);
            return this.pcClient.setLocalDescription(answer);
          }).then(() => {
            if (this.onWebRtcAnswer) {
              let answer = {
                type: this.pcClient.currentLocalDescription.type,
                sdp: this.pcClient.currentLocalDescription.sdp,
                sceneId: this.sceneId
              }
              this.onWebRtcAnswer(answer);
            }
          }).then(() => {
            let receivers = this.pcClient.getReceivers();
            for (let receiver of receivers) {
              receiver.playoutDelayHint = 0;
            }
          }).catch((error) => console.error("createAnswer() failed:", error));
        });
      });
    } else {
      console.log("PeerConnection is already exist.");
    }
  };

  // Called externaly when an answer is received from the server
  receiveAnswer(answer) {
    this.pcClient.setRemoteDescription(answer);
  };

  // peerDataChannels を受け取り、DataChannel に接続を行う
  receiveData(channelData) {
    const sendOptions = {
      ordered: true,
      negotiated: true,
      id: channelData.sendStreamId
    };
    const sendDataChannel = this.pcClient.createDataChannel('datachannel', sendOptions);

    // 送信用と受信用で DataChannel を分ける場合の処理になります。
    if (channelData.sendStreamId != channelData.recvStreamId) {
      const recvOptions = {
        ordered: true,
        negotiated: true,
        id: channelData.recvStreamId
      };
      const recvDataChannel = this.pcClient.createDataChannel('datachannel', recvOptions);
      this.setupDataChannelCallbacks(recvDataChannel);
      this.recvDataChannel = recvDataChannel;
    }
    else {
      this.setupDataChannelCallbacks(sendDataChannel);
    }
    this.sendDataChannel = sendDataChannel;
  }

  closeDataChannel() {
    if (this.sendDataChannel) {
      this.sendDataChannel.onopen = null;
      this.sendDataChannel.onclose = null;
      this.sendDataChannel.onmessage = null;
      this.sendDataChannel.onerror = null;
      this.sendDataChannel.close();
      this.sendDataChannel = null;
    }

    if (this.recvDataChannel) {
      this.recvDataChannel.onopen = null;
      this.recvDataChannel.onclose = null;
      this.recvDataChannel.onmessage = null;
      this.recvDataChannel.onerror = null;
      this.recvDataChannel.close();
      this.recvDataChannel = null;
    }
  }

  close() {
    this.isDataChannelConnected = false;
    this.isVideoConnected = false;

    this.onWebRtcOffer = null;
    this.onWebRtcAnswer = null;
    this.onWebRtcCandidate = null;
    this.onVideoInitialised = null;
    this.onVideoPlaying = null;
    this.onNewVideoTrack = null;
    this.onDataChannelConnected = null;
    this.onDataChannelMessage = null;
    this.onIceDisconnected = null;

    // 映像を停止して、HTMLから削除します。
    if (this.video) {
      console.log('Stopped video. sceneId=' + this.sceneId);

      if (this.video.srcObject) {
        try {
          this.video.srcObject.getTracks().forEach((track) => {
            track.stop();
          });
        } catch (e) {
          console.log('video srcObject error', e);
        }
        this.video.srcObject = null;
      }

      // video タグを使い回すので、ここではエレメントを削除しない。
      // let container = document.getElementById('video-container');
      // if (container) {
      //   container.removeChild(this.video);
      // }  

      this.setVideoVisibility(false);
      this.video = null;
    }

    this.closeDataChannel();

    if (this.pcClient) {
      console.log('Closing existing peerClient. sceneId=' + this.sceneId);
      this.pcClient.onsignalingstatechange = null;
      this.pcClient.oniceconnectionstatechange = null;
      this.pcClient.onicegatheringstatechange = null;
      this.pcClient.ontrack = null;
      this.pcClient.onicecandidate = null;
      this.pcClient.ondatachannel = null;
      this.pcClient.close();
      this.pcClient = null;
    }

    if (this.availableVideoStreams) {
      this.availableVideoStreams.clear();
      this.availableVideoStreams = null;
    }

    if (this.aggregateStatsIntervalId) {
      clearInterval(this.aggregateStatsIntervalId);
      this.aggregateStatsIntervalId = null;
    }
  }

  isConnected() {
    return this.isDataChannelConnected && this.isVideoConnected;
  }

  // Sends data across the datachannel
  send(data) {
    if (this.sendDataChannel && this.sendDataChannel.readyState == 'open') {
      this.sendDataChannel.send(data);
    }
  };

  getStats(onStats) {
    if (this.pcClient && onStats) {
      this.pcClient.getStats(null).then((stats) => { 
        if (typeof(onStats) === 'function') {
          onStats(stats); 
        }
      });
    }
  }

  aggregateStats(checkInterval) {
    let calcAggregatedStats = this.generateAggregatedStatsFunction();
    let printAggregatedStats = () => { this.getStats(calcAggregatedStats); }
    this.aggregateStatsIntervalId = setInterval(printAggregatedStats, checkInterval);
  }

  requestInitialSettings() {
    this.send(new Uint8Array([MessageType.RequestInitialSettings]).buffer);
  }

  requestQualityControl() {
    this.send(new Uint8Array([MessageType.RequestQualityControl]).buffer);
  }

  emitMouseEnter() {
    let data = new DataView(new ArrayBuffer(1));
    data.setUint8(0, MessageType.MouseEnter);
    this.send(data.buffer);
  }

  emitMouseLeave() {
    let data = new DataView(new ArrayBuffer(1));
    data.setUint8(0, MessageType.MouseLeave);
    this.send(data.buffer);
  }

  emitMouseMove(x, y, deltaX, deltaY) {
    let data = new DataView(new ArrayBuffer(9));
    data.setUint8(0, MessageType.MouseMove);
    data.setUint16(1, x, true);
    data.setUint16(3, y, true);
    data.setInt16(5, deltaX, true);
    data.setInt16(7, deltaY, true);
    this.send(data.buffer);
  }
  
  emitMouseDown(button, x, y) {
    let data = new DataView(new ArrayBuffer(6));
    data.setUint8(0, MessageType.MouseDown);
    data.setUint8(1, button);
    data.setUint16(2, x, true);
    data.setUint16(4, y, true);
    this.send(data.buffer);
  }

  emitMouseUp(button, x, y) {
    let data = new DataView(new ArrayBuffer(6));
    data.setUint8(0, MessageType.MouseUp);
    data.setUint8(1, button);
    data.setUint16(2, x, true);
    data.setUint16(4, y, true);
    this.send(data.buffer);
  }

  emitMouseWheel(delta, x, y) {
    let data = new DataView(new ArrayBuffer(7));
    data.setUint8(0, MessageType.MouseWheel);
    data.setInt16(1, delta, true);
    data.setUint16(3, x, true);
    data.setUint16(5, y, true);
    this.send(data.buffer);
  }

  emitTouchStart(touches) {
    this.emitTouchData(MessageType.TouchStart, touches);
  }

  emitTouchMove(touches) {
    this.emitTouchData(MessageType.TouchMove, touches);
  }

  emitTouchEnd(touches) {
    this.emitTouchData(MessageType.TouchEnd, touches);
  }

  emitTouchData(type, touches) {
    let data = new DataView(new ArrayBuffer(2 + 7 * touches.length));
    data.setUint8(0, type);
    data.setUint8(1, touches.length);
    let byte = 2;
    for (let t = 0; t < touches.length; t++) {
      let touch = touches[t];
      data.setUint16(byte, touch.x, true);
      byte += 2;
      data.setUint16(byte, touch.y, true);
      byte += 2;
      data.setUint8(byte, touch.fingerId, true);
      byte += 1;
      data.setUint8(byte, touch.force, true); // force is between 0.0 and 1.0 so quantize into byte.
      byte += 1;
      data.setUint8(byte, touch.valid, true); // mark the touch as in the player or not
      byte += 1;
    }
    this.send(data.buffer);
  }

  // A build-in command can be sent to UE4 client. The commands are defined by a
  // JSON descriptor and will be executed automatically.
  // The currently supported commands are:
  //
  // 1. A command to run any console command:
  //    "{ ConsoleCommand: <string> }"
  //
  // 2. A command to change the resolution to the given width and height.
  //    "{ Resolution.Width: <value>, Resolution.Height: <value> } }"
  //
  emitCommand(descriptor) {
    this.emitDescriptor(MessageType.Command, descriptor);
  }

  emitControllerButtonPressed(controllerIndex, buttonIndex, isRepeat) {
    let data = new DataView(new ArrayBuffer(5));
    data.setUint8(0, MessageType.GamepadButtonPressed);
    data.setUint8(1, controllerIndex, true);
    data.setUint8(2, buttonIndex);
    data.setUint8(3, isRepeat);
    // data.setUint16(1, controllerIndex, true);
    // data.setUint8(3, buttonIndex);
    // data.setUint8(4, isRepeat);
    this.send(data.buffer);
  }

  emitControllerButtonReleased(controllerIndex, buttonIndex) {
    let data = new DataView(new ArrayBuffer(4));
    data.setUint8(0, MessageType.GamepadButtonReleased);
    data.setUint8(1, controllerIndex, true);
    data.setUint8(2, buttonIndex);
    // data.setUint16(1, controllerIndex, true);
    // data.setUint8(3, buttonIndex);
    this.send(data.buffer);
  }

  emitControllerAxisMove(controllerIndex, axisIndex, analogValue) {
    let data = new DataView(new ArrayBuffer(12));
    data.setUint8(0, MessageType.GamepadAnalog);
    data.setUint8(1, controllerIndex, true);
    data.setUint8(2, axisIndex);
    data.setFloat64(3, analogValue, true);
    // data.setUint16(1, controllerIndex, true);
    // data.setUint8(3, axisIndex);
    // data.setFloat64(4, analogValue, true);
    this.send(data.buffer);
  }

  emitUIInteraction(descriptor) {
    this.emitDescriptor(MessageType.UIInteraction, descriptor);
  }

  emitOsc(path, type, data) {
    let jsonObj = null;
    if (!data) {
        jsonObj = { "path": path, "type": type, "data": [] };
    } else if (Array.isArray(data)) {
        jsonObj = { "path": path, "type": type, "data": data };
    } else {
        jsonObj = { "path": path, "type": type, "data": [data] };
    }
    this.emitDescriptor(MessageType.Osc, jsonObj);
  }
  
  emitCameraSwitchResponse(data) {
    this.emitDescriptor(MessageType.CameraSwitchResponse, data);
  }
  
  emitCameraSetRes(data) {
    this.emitDescriptor(MessageType.CameraSetRes, data);
  }

  emitLatencyTest(descriptor) {
    this.emitDescriptor(MessageType.LatencyTest, descriptor);
  }

  emitDescriptor(messageType, descriptor) {
    let descriptorAsString = descriptor;
    if (typeof(descriptor) != 'string') {
      // Convert the dscriptor object into a JSON string.
      descriptorAsString = JSON.stringify(descriptor);
    }

    // Add the UTF-16 JSON string to the array byte buffer, going two bytes at
    // a time.
    let data = new DataView(new ArrayBuffer(1 + 2 + 2 * descriptorAsString.length));
    let byteIdx = 0;
    data.setUint8(byteIdx, messageType);
    byteIdx++;
    data.setUint16(byteIdx, descriptorAsString.length, true);
    byteIdx += 2;
    for (let i = 0; i < descriptorAsString.length; i++) {
      data.setUint16(byteIdx, descriptorAsString.charCodeAt(i), true);
      byteIdx += 2;
    }

    this.send(data.buffer);
  }
}
