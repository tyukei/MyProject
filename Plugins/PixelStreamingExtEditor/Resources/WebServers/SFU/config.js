// Parse passed arguments
let passedPublicIP = null;
let passedSignallingURL = null;
let passedaddPublicIP = null;
let passedRtcMinPort = null;
let passedRtcMaxPort = null;
let passedWorkerNum = null;
for(let arg of process.argv){
  if(arg && arg.startsWith("--PublicIP=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      passedPublicIP = splitArr[1];
      console.log("--PublicIP=" + passedPublicIP);
    }
  }
  if(arg && arg.startsWith("--SignallingURL=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      passedSignallingURL = splitArr[1];
      console.log("--SignallingURL=" + passedSignallingURL);
    }
  }
  if(arg && arg.startsWith("--addPublicIP=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      passedaddPublicIP = splitArr[1];
      console.log("--addPublicIP=" + passedaddPublicIP);
    }
  }
  if(arg && arg.startsWith("--rtcMinPort=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      if (!isNaN(splitArr[1])) {
        passedRtcMinPort = Number(splitArr[1]);
        console.log("--rtcMinPort=" + passedRtcMinPort);
      } else {
        console.log("  invalid parameter : --rtcMinPort , set default.");
      }
    }
  }
  if(arg && arg.startsWith("--rtcMaxPort=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      if (!isNaN(splitArr[1])) {
        passedRtcMaxPort = Number(splitArr[1]);
        console.log("--rtcMaxPort=" + passedRtcMaxPort);
      } else {
        console.log("  invalid parameter : --rtcMaxPort , set default.");
      }
    }
  }
  if(arg && arg.startsWith("--workerNum=")){
    let splitArr = arg.split("=");
    if(splitArr.length == 2){
      if (!isNaN(splitArr[1])) {
        passedWorkerNum = Number(splitArr[1]);
        console.log("--workerNum=" + passedWorkerNum);
      } else {
        console.log("  invalid parameter : --workerNum , set default.");
      }
    }
  }
}

const config = {
  signallingURL: passedSignallingURL != null ? passedSignallingURL : "ws://localhost:8889",

  mediasoup: {
    worker: {
      rtcMinPort: passedRtcMinPort != null ? passedRtcMinPort : 40000,
      rtcMaxPort: passedRtcMaxPort != null ? passedRtcMaxPort : 49999,
      logLevel: "debug",
      logTags: [
        "info",
        "ice",
        "dtls",
        "rtp",
        "srtp",
        "rtcp",
        "sctp"
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
      workerNum: passedWorkerNum != null ? passedWorkerNum : 3,
    },
    router: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
          parameters: {
            stereo: 1
          }
        },
        {
          kind: "video",
          mimeType: "video/vp8",
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: "video",
          mimeType: "video/vp9",
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: "video",
          mimeType: "video/h264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1
          }
        }
      ],
    },

    // here you must specify ip addresses to listen on
    // some browsers have issues with connecting to ICE on
    // localhost so you might have to specify a proper
    // private or public ip here.
    webRtcTransport: {
      listenIps: passedPublicIP != null ? [{ ip: "0.0.0.0", announcedIp: passedPublicIP}] : getLocalListenIps(), 
      // 100 megabits
      initialAvailableOutgoingBitrate: 100_000_000,
    },
  },
}

function getLocalListenIps() {
  const listenIps = []
  if (typeof window === 'undefined') {
    const os = require('os')
    const networkInterfaces = os.networkInterfaces()
    const ips = []
    if (networkInterfaces) {
      for (const [key, addresses] of Object.entries(networkInterfaces)) {
        addresses.forEach(address => {
          if (address.family === 'IPv4') {
            listenIps.push({ ip: address.address, announcedIp: null })
          }
          /* ignore link-local and other special ipv6 addresses.
           * https://www.iana.org/assignments/ipv6-address-space/ipv6-address-space.xhtml
           */
          else if (address.family === 'IPv6' && address.address[0] !== 'f') {
            listenIps.push({ ip: address.address, announcedIp: null })
          }
        })
      }
    }
  }
  if (listenIps.length === 0) {
    listenIps.push({ ip: '127.0.0.1', announcedIp: null })
  }
  if (passedaddPublicIP != null) {
    listenIps.push({ ip: "0.0.0.0", announcedIp: passedaddPublicIP})
  }
  return listenIps
}

module.exports = config;
