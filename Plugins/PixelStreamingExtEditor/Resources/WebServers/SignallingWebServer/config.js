const path = require('path');
const CameraMode = require("./camera-mode.js");

/**
 * デフォルト値を定義します。
 */
const DEF_MAX_PLAYER_CONTROLLERS = 50;
const DEF_HTTP_PORT = 80;
const DEF_HTTPS_PORT = 443;
const DEF_STREAMER_PORT = 8888;
const DEF_SFU_PORT = 8889;
const DEF_PEER_CONNECTION_OPTIONS = { type: 'config', peerConnectionOptions: {} };

const defaultConfig = {
  UseHTTPS: false,
  LogToFile: true,
  LogVerbose: true,
  EnableJWT: false,
  PublicIp: "localhost",
  HttpPort: DEF_HTTP_PORT,
  HttpsPort: DEF_HTTPS_PORT,
  StreamerPort: DEF_STREAMER_PORT,
  SFUPort: DEF_SFU_PORT,
  KeepAlive: 30000,
  maxPlayerControllers : DEF_MAX_PLAYER_CONTROLLERS
};

var loadedConfig;

function initConfig() {
  if (loadedConfig) return loadedConfig;

  const argv = require('yargs').argv;
  const configFile = (typeof argv.configFile != 'undefined') ? argv.configFile.toString() : path.join(__dirname, 'config.json');
  console.log(`configFile ${configFile}`);
  const config = require('./modules/config.js').init(configFile, defaultConfig);

  // 引数から HttpPort を取得
  if (typeof argv.HttpPort != 'undefined') {
    config.HttpPort = parseInt(argv.HttpPort.toString());
  }
  if (isNaN(config.HttpPort)) {
    console.log(`HttpPort(${argv.HttpPort.toString()}) was an invalid value. Set default HttpPort(${DEF_HTTP_PORT}). `);
    config.HttpPort = DEF_HTTP_PORT;
  }

  // 引数から HttpsPort を取得
  if (typeof argv.HttpsPort != 'undefined') {
    config.HttpsPort = parseInt(argv.HttpsPort.toString());
  }
  if (isNaN(config.HttpsPort)) {
    console.log(`HttpsPort(${argv.HttpsPort.toString()}) was an invalid value. Set default HttpsPort(${DEF_HTTPS_PORT}). `);
    config.HttpsPort = DEF_HTTPS_PORT;
  }

  // 引数から StreamerPort を取得
  if (typeof argv.StreamerPort != 'undefined') {
    config.StreamerPort = parseInt(argv.StreamerPort.toString());
  }
  if (isNaN(config.StreamerPort)) {
    console.log(`StreamerPort(${argv.StreamerPort.toString()}) was an invalid value. Set default StreamerPort(${DEF_STREAMER_PORT}). `);
    config.StreamerPort = DEF_STREAMER_PORT;
  }

  // 引数から SFUPort を取得
  if (typeof argv.SFUPort != 'undefined') {
    config.SFUPort = parseInt(argv.SFUPort.toString());
  }
  if (isNaN(config.SFUPort)) {
    console.log(`SFUPort(${argv.SFUPort.toString()}) was an invalid value. Set default SFUPort(${DEF_SFU_PORT}). `);
    config.SFUPort = DEF_SFU_PORT;
  }

  // 引数から maxPlayerControllers を取得
  if (typeof argv.maxPlayerControllers != 'undefined') {
    config.maxPlayerControllers = parseInt(argv.maxPlayerControllers.toString());
  }
  if (isNaN(config.maxPlayerControllers)) {
    console.log(`maxPlayerControllers(${argv.maxPlayerControllers.toString()}) was an invalid value. Set default maxPlayerControllers(${DEF_MAX_PLAYER_CONTROLLERS}). `);
    config.maxPlayerControllers = DEF_MAX_PLAYER_CONTROLLERS;
  }

  try {
    config.peerConnectionOptions = (typeof argv.peerConnectionOptions != 'undefined') ? JSON.parse(argv.peerConnectionOptions.toString()) : DEF_PEER_CONNECTION_OPTIONS;
  } catch (e) {
    config.peerConnectionOptions = DEF_PEER_CONNECTION_OPTIONS;
  }

  console.log("Config: " + JSON.stringify(config, null, '\t'));
  loadedConfig = config;
  return config;
}

module.exports = initConfig;
