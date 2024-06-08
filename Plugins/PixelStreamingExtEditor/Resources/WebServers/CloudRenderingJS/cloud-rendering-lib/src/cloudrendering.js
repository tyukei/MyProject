'use strict';

import { CRWebsocket } from "./websocket.js";
import { WebRTCPlayer } from "./webrtc-player.js";
import { GamepadAnalog, GamepadButton } from "./gamepad-type.js";
import { ToClientMessageType } from "./message-type.js";

/**
 * 統計情報コンソールログ出力設定を定義します。
 * 
 * @private
 */
const StatsLog = false;

/**
 * キーが離された時にリリースを発生させる回数を定義します。
 * 
 * @private
 */
const ReleaseKeyCnt = 3;

/**
 * キーリピートを行うためのクラス。
 * 
 * @private
 */
class KeyRepeat {
  constructor() {
    this.cnt = 0;
    this.timer = null;
  }

  clear() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.cnt = 0;
  }

  start(func) {
    this.clear();
    this.timer = setInterval(() => {
      this.cnt++;
      if (this.timer && this.cnt > ReleaseKeyCnt) {
        this.clear();
        return;
      }
      func();
    }, 66);
    func();
  }
}

/**
 * PixelStreaming拡張版の操作を行うためのクラス。
 */
export class CloudRendering {
  /**
   * @constructor
   * @param {Object} userInfo ユーザ情報
   */
  constructor (userInfo) {
    this.ws = null;
    this.userInfo = userInfo;
    this.playerId = null;
    // WebRTC プレイヤーを格納するマップ。
    this.webRtcPlayerObjs = new Map();
    // シグナリングサーバから送られてくる RTCPeerConnection などの設定を格納します。
    this.config = null;
    this.qualityController = false;
    this.videoEncoderQP = "N/A";
    this.videoEncoderQPListeners = new Map();
    this.keyFrontBackRepeat = new KeyRepeat();
    this.keyLeftRightRepeat = new KeyRepeat();
    this.retryDataChannelCount = 0;
    this.inputControl = false;
  }

  /**
   * WebSocket への接続を行います。
   * 
   * @param {String} wsUrl WebSocket への URL
   */
  connect(wsUrl) {
    this.ws = new CRWebsocket();

    this.ws.onOpen = () => {
      // ユーザ情報を送信します。
      this.ws.sendUserInfo(this.userInfo);
    }

    this.ws.onConfig = (config) => {
      this.config = config;

      // websocket の接続イベントを通知します。
      if (typeof(this.onWSConnected) == 'function') {
        this.onWSConnected();
      }
    }

    this.ws.onPlayerId = (msg) => {
      this.playerId = msg.playerId;

      if (typeof(this.onPlayerId) == 'function') {
        this.onPlayerId(msg);
      }
    }

    this.ws.onPlayerCount = (msg) => {
      if (typeof(this.onPlayerCount) == 'function') {
        this.onPlayerCount(msg);
      }
    }

    this.ws.onStreamerList = (msg) => {
      if (typeof(this.onStreamerList) == 'function') {
        this.onStreamerList(msg);
      }
    }

    this.ws.onStreamerReady = (msg) => {
      if (typeof(this.onStreamerReady) == 'function') {
        this.onStreamerReady(msg);
      }
    }

    this.ws.onWebRtcOffer = (msg) => {
      let sceneId = msg.sceneId;
      let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
      if (webRtcPlayerObj) {
        webRtcPlayerObj.receiveOffer(msg);
        this.setupStats(webRtcPlayerObj);
      }
    }

    this.ws.onWebRtcAnswer = (msg) => {
      let sceneId = msg.sceneId;
      let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
      if (webRtcPlayerObj) {
        this.setupStats(webRtcPlayerObj);
      }
    }

    this.ws.onWebRtcIce = (msg) => {
      let sceneId = msg.sceneId;
      let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
      if (webRtcPlayerObj) {
          webRtcPlayerObj.handleCandidateFromServer(msg.candidate);
      }
    }

    this.ws.onWebRtcDatachannel = (msg) => {
      let sceneId = msg.sceneId;
      let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
      if (webRtcPlayerObj) {
        webRtcPlayerObj.receiveData(msg);
      }
    }

    this.ws.onWebRtcDatachannelFailed = (msg) => {
      let sceneId = msg.sceneId;
      let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
      if (webRtcPlayerObj) {
        webRtcPlayerObj.closeDataChannel();

        this.retryDataChannelCount++;

        if (this.retryDataChannelCount < 3) {
          setTimeout(() => {
            this.sendDataChannelRequest(sceneId);
          }, 100);
        } else {
          if (this.ws) {
            console.log('Failed to connect a DataChannel.');
            this.ws.onWSClose({code: 0, reason: 'Failed to connect a DataChannel.'});
            this.close();
          }
        }
      }
    }

    this.ws.onWebRtcDisconnectScene = (msg) => {
      if (typeof(this.onWebRtcDisconnectScene) == 'function') {
        this.onWebRtcDisconnectScene(msg);
      }
    }

    this.ws.onWSError = (event) => {
      if (typeof(this.onWSError) == 'function') {
        this.onWSError(event);
      }
    }

    this.ws.onWSClose = (event) => {
      // Websocket が切断された場合には、全ての WebRtcPlayer で切断処理を行う。
      this.closeWebRtcPlayers();
      if (typeof(this.onWSClose) == 'function') {
        this.onWSClose(event);
      }
    }

    this.ws.connect(wsUrl);
  }

  /**
   * Websocket の接続を切断します。
   * <p>
   * 接続されていない場合には、何もしません。
   */
  close(code = undefined) {
    this.closeWebRtcPlayers();

    if (this.ws) {
      this.ws.close(code);
      this.ws = null;
    }

    this.onWSConnected = undefined;
    this.onWSError = undefined;
    this.onWSClose = undefined;
    this.onPlayerId = undefined;
    this.onPlayerCount = undefined;
    this.onStreamerList = undefined;
    this.onStreamerReady = undefined;
    this.onVideoPlaying = undefined;
    this.onReceivedCustomMessage = undefined;
    this.onReceivedResponse = undefined;
    this.onReceivedCommand = undefined;
    this.onReceivedInitialSettings = undefined;
    this.onReceivedCameraSwitchRequest = undefined;
  }

  /**
   * Websocket との接続状態を確認します。
   * 
   * @returns 接続されている場合は true、それ以外は false
   */
  isOpenWebsocket() {
    return this.ws && this.ws.isConnected();
  }

  /**
   * 指定された SceneId に接続を行います。
   * 
   * @param {String} sceneId SceneId
   * @param {*} datachannel データチャンネル接続の有無
   */
  connectWebRtcPlayer(sceneId, datachannel = false) {
    let webRtcPlayerObj = this.createWebRtcPlayer(sceneId, datachannel);
    this.webRtcPlayerObjs.set('' + sceneId, webRtcPlayerObj);
  }

  /**
   * 指定された SceneId に対する WebRTC が接続されているか確認を行います。
   * 
   * @param {String} sceneId SceneId
   * @returns 接続している場合はtrue、それ以外はfalse
   */
  isConnectedWebRtcPlayer(sceneId) {
    let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
    if (webRtcPlayerObj) {
      return webRtcPlayerObj.isConnected();
    }
    return false;
  }

  /**
   * 全ての WebRtcPlayer を切断します。
   */
  closeWebRtcPlayers() {
    for (let sceneId of this.webRtcPlayerObjs.keys()) {
      this.closeWebRtcPlayer(sceneId);
    }
    this.webRtcPlayerObjs = new Map();
  }

  /**
   * 指定された SceneId に接続している WebRtcPlayer を切断します。
   * 
   * @param {String} sceneId シーンID
   */
  closeWebRtcPlayer(sceneId) {
    this.clearGamepad();
    this.stopJump();

    let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
    if (webRtcPlayerObj) {
      webRtcPlayerObj.close();
      webRtcPlayerObj = null;

      // 切断を通知します。
      this.ws.send(JSON.stringify({
        type: "sceneDisconnected",
        playerId: this.playerId,
        sceneId: sceneId
      }));

      this.webRtcPlayerObjs.delete(sceneId);
    }
  }

  setVideoMuted(sceneId, muted) {
    let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
    if (webRtcPlayerObj) {
      webRtcPlayerObj.setVideoMuted(muted);
    }
  }

  /**
   * 指定された SceneId に接続している WebRtcPlayer の video タグを表示します。
   * 
   * 接続直後は、video タグは、非表示になっています。
   * このメソッドを呼び出して、表示するようにします。
   * 
   * @param {String} sceneId シーンID
   */
  setWebRtcPlayerVisibility(sceneId) {
    let webRtcPlayerObj = this.webRtcPlayerObjs.get('' + sceneId);
    if (webRtcPlayerObj) {
      webRtcPlayerObj.setVideoVisibility(true);
      // 画面を表示するときにミュートを解除します。
      // webRtcPlayerObj.setVideoMuted(false);
    }
  }

  /**
   * WebRtcPlayer のインスタンスを作成します。
   * 
   * @param {String} sceneId 接続先の シーンID
   * @param {Boolean} datachannel データチャンネル接続の有無
   * @returns WebRtcPlayer のインスタンス
   */
  createWebRtcPlayer(sceneId, datachannel = false) {
    let webRtcPlayerObj = new WebRTCPlayer(sceneId, this.config, datachannel, this.userInfo.cameraMode);
    webRtcPlayerObj.onWebRtcOffer = (offer) => {
      if (this.isOpenWebsocket()) {
        let offerStr = JSON.stringify(offer);
        console.log("%c[Outbound SS message (offer)]", "background: lightgreen; color: black", offer);
        this.ws.send(offerStr);
      }
    };

    webRtcPlayerObj.onWebRtcAnswer = (answer) => {
      if (this.isOpenWebsocket()) {
        let answerStr = JSON.stringify(answer);
        console.log("%c[Outbound SS message (answer)]", "background: lightgreen; color: black", answer);
        this.ws.send(answerStr);

        // DataChannel の接続を要求
        if (datachannel) {
          this.sendDataChannelRequest(sceneId);
        }

        // 映像を有効にします。
        webRtcPlayerObj.setVideoEnabled(true);
      }
    };

    webRtcPlayerObj.onWebRtcCandidate = (candidate) => {
      if (this.isOpenWebsocket()) {
        console.log("%c[Browser ICE candidate]", "background: violet; color: black", "| Type=", 
            candidate.type, "| Protocol=", candidate.protocol, "| Address=", 
            candidate.address, "| Port=", candidate.port, "|");
        let iceCandidate = JSON.stringify({
          type: 'iceCandidate',
          candidate: candidate,
          sceneId: sceneId
        });
        console.log("%c[Outbound SS message (iceCandidate)]", "background: lightgreen; color: black", iceCandidate);
        this.ws.send(iceCandidate);
      }
    };

    webRtcPlayerObj.onVideoInitialised = () => {
      webRtcPlayerObj.video.play().catch(function(onRejectedReason) {
        console.log(onRejectedReason);
        console.log("Browser does not support autoplaying video without interaction " 
                    + "- to resolve this we are going to show the play button overlay.")
      });
    };

    webRtcPlayerObj.onVideoPlaying = (videoElem) => {
      if (typeof(this.onVideoPlaying) == 'function') {
        this.onVideoPlaying(videoElem);
      }
      setTimeout(() => {
        this.clearGamepad();
        this.stopJump();
      }, 100);
    };

    webRtcPlayerObj.onNewVideoTrack = () => {
      if (webRtcPlayerObj.video && webRtcPlayerObj.video.srcObject && webRtcPlayerObj.onVideoInitialised) {
        webRtcPlayerObj.onVideoInitialised();
      }
    }

    webRtcPlayerObj.onDataChannelConnected = () => {
      if (this.isOpenWebsocket()) {
        // SFU 側の DataChannel 開通状況が不明なので遅延呼び出しを設定。
        setTimeout(() => {
          this.requestQualityControl();
          this.requestInitialSettings();
        }, 1000);
      }
    };

    webRtcPlayerObj.onDataChannelMessage = (msg) => {
      try {
        this.processStats(msg, webRtcPlayerObj);
      } catch (err) {
        console.log(`WebRtcPlayer datachannel error.`, err);
      }
    };

    webRtcPlayerObj.onIceDisconnected = () => {
      if (typeof(this.onIceDisconnected) == 'function') {
        this.onIceDisconnected();
      }
    };

    // 接続を通知
    this.ws.send(JSON.stringify({
      type: "sceneConnected",
      playerId: this.playerId,
      sceneId: sceneId
    }));

    return webRtcPlayerObj;
  }

  /**
   * データチャンネルが接続されている WebRtcPlayer を取得します。
   * 
   * データチャンネルが接続されている WebRtcPlayer が存在しない場合は null を返却します。
   * 
   * @returns WebRtcPlayerのインスタンス
   */
  getWebRtcPlayer() {
    for (let sceneId of this.webRtcPlayerObjs.keys()) {
      let webRtcPlayerObj = this.webRtcPlayerObjs.get(sceneId);
      if (webRtcPlayerObj.useDataChannel) {
        return webRtcPlayerObj;
      }
    }
    return null;
  }

  /**
   * Websocket の接続時に呼び出します。
   */
  onWSConnected() {
    console.log('onWSConnected not implements.', event);
  }

  /**
   * Websocket でエラーが発生した時に呼び出します。
   * 
   * @param {Object} event エラーイベント
   */
  onWSError(event) {
    console.log('onWSError not implements.', event);
  }

  /**
   * Websocket が切断された時に呼び出します。
   */
  onWSClose() {
    console.log('onWSClose not implements.');
  }

  /**
   * カメラ切り替えイベントを受信したことを通知します。
   * 
   * @param {Object} msg メッセージ
   */
  onReceivedCameraSwitchRequest(msg) {
    console.log('onReceivedCameraSwitchRequest not implements.', msg);
  }

  /**
   * カスタムメッセージを受信したことを通知します。
   * 
   * @param {String} msg メッセージ
   */
  onReceivedCustomMessage(msg) {
    console.log('onReceivedCustomMessage not implements.', msg);
  }

  /**
   * レスポンスを受信したことを通知します。
   * 
   * @param {JSON} response レスポンス
   */
  onReceivedResponse(response) {
    console.log('onReceivedResponse not implements.', response);
  }

  /**
   * コマンド要求を受信したことを通知します。
   * 
   * @param {JSON} command コマンド
   */
  onReceivedCommand(command) {
    console.log('onReceivedCommand not implements.', command);
  }

  /**
   * 初期設定の値を受信したことを通知します。
   * 
   * @param {JSON} settings 初期設定情報
   */
  onReceivedInitialSettings(settings) {
    console.log('onReceivedInitialSettings not implements.', settings);
  }

  /**
   * 映像の再生が開始されたことを通知します。
   * 
   * @param {HTMLElement} videoElem 映像を開始した video タグ
   */
  onVideoPlaying(videoElem) {
    console.log('onVideoPlaying not implements.' + videoElem);
  }

  /**
   * ビデオエンコーダ量子化パラメータ取得
   * @returns {Stroing} ビデオエンコーダー量子化パラメータ
   */
  getVideoEncoderQP() {
    return this.videoEncoderQP;
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー登録
   * @param {String} name 登録識別子
   * @param {function} listener リスナー関数
   */
  addVideoEncoderQPListener(name, listener) {
    this.videoEncoderQPListeners.set(name, listener);
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー解除
   * @param {String} name 解除識別子
   */
  removeVideoEncoderQPListener(name) {
    this.videoEncoderQPListeners.remove(name);
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー全解除
   */
  clearVideoEncoderQPListener() {
    this.videoEncoderQPListeners.clear;
  }

  /**
   * 品質管理機能設定
   * @param {Boolean} param true(有効) / false(無効)
   */
  setQualityController(param) {
    if (param instanceof Boolean) {
      this.qualityController = param;
    }
  }

  /**
   * 品質管理機能状態
   * @returns true(有効) / false(無効)
   */
  isQualityController() {
    return this.qualityController;
  }

  /**
   * 品質管理機能要求を行います。
   */
  requestQualityControl() {
    if (!this.qualityController) {
      let webRtcPlayerObj = this.getWebRtcPlayer();
      if (webRtcPlayerObj) {
          webRtcPlayerObj.requestQualityControl();
      }
    }
  }

  /**
   * 初期設定要求を行います。
   */
  requestInitialSettings() {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.requestInitialSettings();
    }
  }

  /**
   * コマンドを DataChannel 経由で送信します。
   * 
   * @param {JsonObject} descriptor 
   */
  sendCommand(descriptor) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitCommand(descriptor);
    }
  }

  /**
   * ボタンが押されたことを DataChannel 経由で送信します。
   * 
   * @param {Number} buttonIndex ボタン番号
   * @param {Boolean} isRepeat リピートフラグ(リピートする場合は true、それ以外は false)
   */
  sendControllerButtonPressed(buttonIndex, isRepeat) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitControllerButtonPressed(this.playerId, buttonIndex, isRepeat);
    }
  }

  /**
   * ボタンが離されたことを DataChannel 経由で送信します。
   * 
   * @param {Number} buttonIndex ボタン番号
   */
  sendControllerButtonReleased(buttonIndex) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitControllerButtonReleased(this.playerId, buttonIndex);
    }
  }

  /**
   * アナログキーを値を DataChannel 経由で送信します。
   * 
   * @param {Number} axisIndex 軸のインデックス
   * @param {Number} analogValue アナログの値
   */
  sendControllerAxisMove(axisIndex, analogValue) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitControllerAxisMove(this.playerId, axisIndex, analogValue);
    }
  }

  /**
   * UIInteraction のメッセージを DataChannel 経由で送信します。
   * 
   * @param {Object} descriptor 送信するメッセージ
   */
  sendUIInteraction(descriptor) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitUIInteraction(descriptor);
    }
  }

  /**
   * OSC メッセージを DataChannel 経由で送信します。
   * 
   * @param {String} path パス
   * @param {String} type タイプ
   * @param {Array} data パラメータのデータ
   */
  sendOSC(path, type, data) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitOsc(path, type, data);
    }
  }

  /**
   * SceneId のリスト取得を送信します。
   */
  sendListStreamers() {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'listStreamers'
      }));
    }
  }

  /**
   * LatencyTest のメッセージを DataChannel 経由で送信します。
   * 
   * @param {Object} descriptor 送信するメッセージ
   */
  sendLatencyTest(descriptor) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitLatencyTest(descriptor);
    }
  }

  /**
   * GamePad の値を初期化します。
   */
  clearGamepad() {
    this.sendControllerAxisMove(GamepadAnalog.RightAnalogX, 0);
    this.sendControllerAxisMove(GamepadAnalog.RightAnalogY, 0);
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogX, 0);
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogY, 0);
  }

  /**
   * 左のアナログスティックの値を送信します。
   * 
   * @param {Number} x アナログスティックのX軸値(-1.0 〜 1.0)
   * @param {Number} y アナログスティックのY軸値(-1.0 〜 1.0)
   */
  leftAnalog(x, y) {
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogX, x);
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogY, y);
  }

  /**
   * 右のアナログスティックの値を送信します。
   * 
   * @param {Number} x アナログスティックのX軸値(-1.0 〜 1.0)
   * @param {Number} y アナログスティックのY軸値(-1.0 〜 1.0)
   */
  rightAnalog(x, y) {
    this.sendControllerAxisMove(GamepadAnalog.RightAnalogX, x);
    this.sendControllerAxisMove(GamepadAnalog.RightAnalogY, y);
  }

  /**
   * ジャンプにアサインされたボタン押下を送信します。
   */
  jump() {
    this.sendControllerButtonPressed(GamepadButton.FaceButtonBottom, false);
    // this.sendOSC('/avatar/' + this.playerId + '/jump', 'i', ['1']);
  }

  stopJump() {
    this.sendControllerButtonReleased(GamepadButton.FaceButtonBottom, false);
  }

  pressMoveFrontBack(value) {
    this.keyFrontBackRepeat.clear();
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogY, value);
  }

  releaseMoveFrontBack() {
    this.keyFrontBackRepeat.start(() => {
      this.sendControllerAxisMove(GamepadAnalog.LeftAnalogY, 0);
    });
  }

  pressMoveLeftRight(value) {
    this.keyLeftRightRepeat.clear();
    this.sendControllerAxisMove(GamepadAnalog.LeftAnalogX, value);
  }

  releaseMoveLeftRight() {
    this.keyLeftRightRepeat.start(() => {
      this.sendControllerAxisMove(GamepadAnalog.LeftAnalogX, 0);
    });
  }

  pressMoveFront() {
    this.pressMoveFrontBack(1);
    // this.sendOSC('/avatar/' + this.playerId + '/move', 'i', ['1']);
  }

  releaseMoveFront() {
    this.releaseMoveFrontBack();
    // this.sendOSC('/avatar/' + this.playerId + '/move', 'i', ['0']);
  }

  pressMoveBack() {
    this.pressMoveFrontBack(-1);
    // this.sendOSC('/avatar/' + this.playerId + '/move', 'i', ['-1']);
  }

  releaseMoveBack() {
    this.releaseMoveFrontBack();
    // this.sendOSC('/avatar/' + this.playerId + '/move', 'i', ['0']);
  }

  pressMoveLeft() {
    this.pressMoveLeftRight(-1);
    // this.sendOSC('/avatar/' + this.playerId + '/turn', 'i', ['-1']);
  }

  releaseMoveLeft() {
    this.releaseMoveLeftRight();
    // this.sendOSC('/avatar/' + this.playerId + '/turn', 'i', ['0']);
  }

  pressMoveRight() {
    this.pressMoveLeftRight(1);
    // this.sendOSC('/avatar/' + this.playerId + '/turn', 'i', ['1']);
  }

  releaseMoveRight() {
    this.releaseMoveLeftRight();
    // this.sendOSC('/avatar/' + this.playerId + '/turn', 'i', ['0']);
  }

  // TODO マウスの座標は、0から 65536 に変換する必要がある。
  // ただし、マウスなどの処理は、playerId が送れないので、操作には使用ができません。

  pressMouseButtons(button, x, y) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseDown(button, x, y);
    }
  }

  moveMouseButtons(x, y, deltaX, deltaY) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseMove(x, y, deltaX, deltaY);
    }
  }

  releaseMouseButtons(button, x, y) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseUp(button, x, y);
    }
  }

  moveMouseWheel(delta, x, y) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseWheel(delta, x, y);
    }
  }

  mouseEnter() {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseEnter();
    }
  }

  mouseLeave() {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitMouseLeave();
    }
  }

  touchStart(touches) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitTouchStart(touches);
    }
  }

  touchMove(touches) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitTouchMove(touches);
    }
  }

  touchEnd(touches) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitTouchEnd(touches);
    }
  }

  /**
   * 入力制御機能設定
   * @param {Boolean} param true(有効) / false(無効)
   */
  setInputControl(param) {
    if (param instanceof Boolean) {
      this.inputControl = param;
    }
  }

  //// Commands

  /**
   * ゲーム内 HUD への PixelStreaming ステータス表示設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setHudStats(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.HUDStats ' + param });
      result = true;
    }
    return result;
  }

  /**
   * レイテンシテストのトリガー機能無効化設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setDisableLatencyTester(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.DisableLatencyTester ' + param });
      result = true;
    }
    return result;
  }

  /**
   * ターゲットビットレートの設定
   * @param {number} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderTargetBitrate(bitrate) {
    let result = false;
    if (bitrate >= -1 && bitrate != 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.TargetBitrate ' + bitrate });
      result = true;
    }
    return result;
  }

  /**
   * 最大ビットレートの設定
   * @param {number} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMaxBitrateVBR(bitrate) {
    let result = false;
    if (bitrate > 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.MaxBitrateVBR ' + bitrate });
      result = true;
    }
    return result;
  }

  /**
   * フレームデータダンプ機能設定（デバッグ用）
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderDumpDebugFrames(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.DumpDebugFrames ' + param });
      result = true;
    }
    return result;
  }

  /**
   * 最小量子化パラメータの設定
   * @param {number} minQP 最小量子化パラメータ（-1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMinQP(minQP) {
    let result = false;
    if (minQP >= -1 && minQP <= 51) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.MinQP ' + minQP });
      result = true;
    }
    return result;
  }

  /**
   * 最大量子化パラメータの設定
   * @param {number} maxQP 最大量子化パラメータ（-1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMaxQP(maxQP) {
    let result = false;
    if (maxQP >= -1 && maxQP <= 51) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.MaxQP ' + maxQP });
      result = true;
    }
    return result;
  }

  /**
   * エンコーダの RateControl モード設定
   * @param {string} mode モード（ConstQP / VBR / CBR）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderRateControl(mode) {
    let result = false;
    if (mode == 'ConstQP' || mode == 'VBR' || mode == 'CBR') {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.RateControl ' + mode });
      result = true;
    }
    return result;
  }

  /**
   * ビットレート維持用ジャンクデータ挿入設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderEnableFillerData(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.EnableFillerData ' + param });
      result = true;
    }
    return result;
  }

  /**
   * エンコーダマルチパスモード設定
   * @param {string} mode モード（DISABLED / QUARTER / FULL）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMultipass(mode) {
    let result = false;
    if (mode == 'DISABLED' || mode == 'QUARTER' || mode == 'FULL') {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.Multipass ' + mode });
      result = true;
    }
    return result;
  }

  /**
   * H264 プロファイル設定
   * @param {string} profile プロファイル名(AUTO / BASELINE / MAIN / HIGH / HIGH444 / STEREO / SVC_TEMPORAL_SCALABILITY / PROGRESSIVE_HIGH / CONSTRAINED_HIGH)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderH264Profile(profile) {
    let result = false;
    if (profile == 'AUTO' || profile == 'BASELINE' || profile == 'MAIN' || profile == 'HIGH'  || profile == 'HIGH444' || profile == 'STEREO'
     || profile == 'SVC_TEMPORAL_SCALABILITY' || profile == 'PROGRESSIVE_HIGH' || profile == 'CONSTRAINED_HIGH') {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.H264Profile ' + profile });
      result = true;
    }
    return result;
  }

  /**
   * 画質劣化の優先度設定
   * @param {string} mode モード（BALANCED / MAINTAIN_FRAMERATE / MAINTAIN_RESOLUTION）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCDegradationPreference(mode) {
    let result = false;
    if (mode == 'BALANCED' || mode == 'MAINTAIN_FRAMERATE' || mode == 'MAINTAIN_RESOLUTION') {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.DegradationPreference ' + mode });
      result = true;
    }
    return result;
  }

  /**
   * 最大FPS設定
   * @param {number} fps FPS 
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCFps(fps) {
    let result = false;
    if (fps > 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.Fps ' + fps });
      result = true;
    }
    return result;
  }

  /**
   * ストリーミング開始時のビットレート設定
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCStartBitrate(bitrate) {
    let result = false;
    if (bitrate > 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.StartBitrate ' + bitrate });
      result = true;
    }
    return result;
  }

  /**
   * 最小ビットレート設定
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCMinBitrate(bitrate) {
    let result = false;
    if (bitrate > 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.MinBitrate ' + bitrate });
      result = true;
    }
    return result;
  }

  /**
   * 最大ビットレート設定
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCMaxBitrate(bitrate) {
    let result = false;
    if (bitrate > 0) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.MaxBitrate ' + bitrate });
      result = true;
    }
    return result;
  }

  /**
   * 量子化パラメータ下位閾値設定
   * @param {number} value 量子化パラメータ（-1 or 1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCLowQpThreshold(value) {
    let result = false;
    if (value == -1 || (value >= 1 && value <= 51)) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.LowQpThreshold ' + value });
      result = true;
    }
    return result;
  }

  /**
   * 量子化パラメータ上位閾値設定
   * @param {number} value 量子化パラメータ（-1 or 1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCHighQpThreshold(value) {
    let result = false;
    if (value == -1 || (value >= 1 && value <= 51)) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.WebRTC.HighQpThreshold ' + value });
      result = true;
    }
    return result;
  }

  /**
   * ブラウザから UE へのオーディオ受信の無効化設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCDisableReceiveAudio(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.DisableReceiveAudio ' + param });
      result = true;
    }
    return result;
  }

  /**
   * UE オーディオのブラウザへの送信無効化設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setWebRTCDisableTransmitAudio(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.DisableTransmitAudio ' + param });
      result = true;
    }
    return result;
  }

  /**
   * WebRTCのオーディオトラックとビデオトラックの同期無効化設定
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setWebRTCDisableAudioSync(param) {
    let result = false;
    if (param == true || param == false) {
      this.sendCommand({ ConsoleCommand: 'PixelStreaming.Encoder.DisableAudioSync ' + param });
      result = true;
    }
    return result;
  }

  /**
   * 統計情報処理
   * @param {Buffer} data 統計情報用データ 
   * @param {WebRTCPlayer} webRtcPlayerObj webRtcPlayerObj 
   */
  processStats(data, webRtcPlayerObj) {
    let view = new Uint8Array(data);
    if (view[0] === ToClientMessageType.QualityControlOwnership) {
      // 外部からのQC要求
      let ownership = view[1] === 0 ? false : true;
      console.log("Received quality controller message, will control quality: " + ownership);
      this.setQualityController(ownership);
    } else if (view[0] === ToClientMessageType.Response) {
      let response = new TextDecoder("utf-16").decode(data.slice(1));
      this.onReceivedResponse(response);
    } else if (view[0] === ToClientMessageType.Command) {
      let commandAsString = new TextDecoder("utf-16").decode(data.slice(1));
      console.log(commandAsString);
      let command = JSON.parse(commandAsString);
      this.onReceivedCommand(command);
    } else if (view[0] === ToClientMessageType.VideoEncoderAvgQP) {
      // ビデオエンコーダーの量子化パラメータ受信
      this.videoEncoderQP = new TextDecoder("utf-16").decode(data.slice(1));
      //console.log(`received VideoEncoderAvgQP ${this.videoEncoderQP}`);
      // リスナーへ送信
      for (let listener of this.videoEncoderQPListeners.values()) {
        listener(this.videoEncoderQP);
      }
    } else if (view[0] === ToClientMessageType.LatencyTest) {
      // レイテンシーテスト開始要求受信
      let latencyTimingsAsString = new TextDecoder("utf-16").decode(data.slice(1));
      console.log("Got latency timings from UE.")
      console.log(latencyTimingsAsString);
      let latencyTimingsFromUE = JSON.parse(latencyTimingsAsString);
      if (webRtcPlayerObj) {
        webRtcPlayerObj.latencyTestTimings.SetUETimings(latencyTimingsFromUE);
      }
    } else if (view[0] === ToClientMessageType.InitialSettings) {
      // 統計情報表示要求受信
      let settingsString = new TextDecoder("utf-16").decode(data.slice(1));
      let settingsJSON = JSON.parse(settingsString);
      if(settingsJSON.PixelStreaming) {
        let allowConsoleCommands = settingsJSON.PixelStreaming.AllowPixelStreamingCommands;
        if(allowConsoleCommands === false){
          console.warn("-AllowPixelStreamingCommands=false, sending console commands from browser to UE is disabled, "
                      + "including toggling FPS and changing encoder settings from the browser.")
        }
        let disableLatencyTest = settingsJSON.PixelStreaming.DisableLatencyTest;
        if(disableLatencyTest) {
          console.warn("-PixelStreamingDisableLatencyTester=true, requesting latency report from the the browser to UE is disabled.")
        }
      }
      this.onReceivedInitialSettings(settingsJSON);
    } else if (view[0] === ToClientMessageType.TestEcho) {
      // Do nothing
    } else if (view[0] === ToClientMessageType.InputControlOwnership) {
      let ownership = view[1] === 0 ? false : true;
      console.log("Received input control ownership message, will input control: " + ownership);
      this.setInputControl(ownership);
    } else if (view[0] === ToClientMessageType.Custom) {
      let message = new TextDecoder("utf-16").decode(data.slice(1));
      if (message) {
        this.onReceivedCustomMessage(message);
      }
    } else if (view[0] === ToClientMessageType.CameraSwitchRequest) {
      let message = new TextDecoder("utf-16").decode(data.slice(1));
      if (message) {
        this.onReceivedCameraSwitchRequest(message);
      }
    } else {
      console.error(`unrecognized data received, packet ID ${view[0]}`);
    }

    // 未実装イベント
    // } else if (view[0] === ToClientMessageType.FreezeFrame) {
    // } else if (view[0] === ToClientMessageType.UnfreezeFrame) {
    // } else if (view[0] == ToClientMessageType.FileExtension) {
    // } else if (view[0] == ToClientMessageType.FileMimeType) {
    // } else if (view[0] == ToClientMessageType.FileContents) {
  }

  /**
   * 統計情報初期設定 
   * @param {*} webRtcPlayerObj WebRTC接続情報オブジェクト 
   */
  setupStats(webRtcPlayerObj) {
    webRtcPlayerObj.aggregateStats(1 * 1000 /* １秒毎にチェック */ );
    
    webRtcPlayerObj.onAggregatedStats = (aggregatedStats) => {
      if (!StatsLog) {
        return;
      }

      let numberFormat = new Intl.NumberFormat(window.navigator.language, {
        maximumFractionDigits: 0
      });
      let timeFormat = new Intl.NumberFormat(window.navigator.language, {
        maximumFractionDigits: 0,
        minimumIntegerDigits: 2
      });

      // 実行時間の算出
      let runTime = (aggregatedStats.timestamp - aggregatedStats.timestampStart) / 1000;
      let timeValues = [];
      let timeDurations = [60, 60];
      for (let timeIndex = 0; timeIndex < timeDurations.length; timeIndex++) {
        timeValues.push(runTime % timeDurations[timeIndex]);
        runTime = runTime / timeDurations[timeIndex];
      }
      timeValues.push(runTime);

      let runTimeSeconds = timeValues[0];
      let runTimeMinutes = Math.floor(timeValues[1]);
      let runTimeHours = Math.floor([timeValues[2]]);

      let receivedBytesMeasurement = 'B';
      let receivedBytes = aggregatedStats.hasOwnProperty('bytesReceived') ? aggregatedStats.bytesReceived : 0;
      let dataMeasurements = ['kB', 'MB', 'GB'];
      for (let index = 0; index < dataMeasurements.length; index++) {
        if (receivedBytes < 100 * 1000)
          break;
        receivedBytes = receivedBytes / 1000;
        receivedBytesMeasurement = dataMeasurements[index];
      }

      const orangeQP = 26;
      const redQP = 35;

      let statsText = '';

      statsText += `sceneId: ${aggregatedStats.sceneId}\n`;

      if (this.videoEncoderQP > redQP) {
        statsText += `Very blocky encoding quality\n`;
      } else if (this.videoEncoderQP > orangeQP) {
        statsText += `Blocky encoding quality\n`;
      }

      statsText += `Duration: ${timeFormat.format(runTimeHours)}:${timeFormat.format(runTimeMinutes)}:${timeFormat.format(runTimeSeconds)}\n`;
      statsText += `Video Resolution: ${
        aggregatedStats.hasOwnProperty('frameWidth') && aggregatedStats.frameWidth && aggregatedStats.hasOwnProperty('frameHeight') && aggregatedStats.frameHeight ?
          aggregatedStats.frameWidth + 'x' + aggregatedStats.frameHeight : 'Chrome only'
      }\n`;
      statsText += `Received (${receivedBytesMeasurement}): ${numberFormat.format(receivedBytes)}\n`;
      statsText += `Frames Decoded: ${aggregatedStats.hasOwnProperty('framesDecoded') ? numberFormat.format(aggregatedStats.framesDecoded) : 'Chrome only'}\n`;
      statsText += `Packets Lost: ${aggregatedStats.hasOwnProperty('packetsLost') ? numberFormat.format(aggregatedStats.packetsLost) : 'Chrome only'}\n`;
      statsText += `Framerate: ${aggregatedStats.hasOwnProperty('framerate') ? numberFormat.format(aggregatedStats.framerate) : 'Chrome only'}\n`;
      statsText += `Frames dropped: ${aggregatedStats.hasOwnProperty('framesDropped') ? numberFormat.format(aggregatedStats.framesDropped) : 'Chrome only'}\n`;
      statsText += `Net RTT (ms): ${aggregatedStats.hasOwnProperty('currentRoundTripTime') ? numberFormat.format(aggregatedStats.currentRoundTripTime * 1000) : 'Can\'t calculate'}\n`;
      statsText += `Browser receive to composite (ms): ${aggregatedStats.hasOwnProperty('receiveToCompositeMs') ? numberFormat.format(aggregatedStats.receiveToCompositeMs) : 'Chrome only'}\n`;
      statsText += `Bitrate (kbps): ${aggregatedStats.hasOwnProperty('bitrate') ? numberFormat.format(aggregatedStats.bitrate) : 'Chrome only'}\n`;
      statsText += `Video Quantization Parameter: ${this.videoEncoderQP}\n`;

      console.log(statsText);
    };

    webRtcPlayerObj.latencyTestTimings.OnAllLatencyTimingsReady = function(timings) {

      if (!timings.BrowserReceiptTimeMs || !StatsLog) {
        return;
      }

      let latencyExcludingDecode = timings.BrowserReceiptTimeMs - timings.TestStartTimeMs;
      let encodeLatency = timings.UEEncodeMs;
      let uePixelStreamLatency = timings.UECaptureToSendMs;
      let ueTestDuration = timings.UETransmissionTimeMs - timings.UEReceiptTimeMs;
      let networkLatency = latencyExcludingDecode - ueTestDuration;

      //these ones depend on FrameDisplayDeltaTimeMs
      let endToEndLatency = null;
      let browserSideLatency = null;

      if (timings.FrameDisplayDeltaTimeMs && timings.BrowserReceiptTimeMs) {
        endToEndLatency = timings.FrameDisplayDeltaTimeMs + networkLatency + (typeof uePixelStreamLatency === "string" ? 0 : uePixelStreamLatency);
        browserSideLatency = timings.FrameDisplayDeltaTimeMs + (latencyExcludingDecode - networkLatency - ueTestDuration);
      }

      let latencyStats = '';
      latencyStats += `Net latency RTT (ms): ${networkLatency.toFixed(2)}\n`;
      latencyStats += `UE Encode (ms): ${(typeof encodeLatency === "string" ? encodeLatency : encodeLatency.toFixed(2))}\n`;
      latencyStats += `UE Send to capture (ms): ${(typeof uePixelStreamLatency === "string" ? uePixelStreamLatency : uePixelStreamLatency.toFixed(2))}\n`;
      latencyStats += `UE probe duration (ms): ${ueTestDuration.toFixed(2)}\n`;
      latencyStats += timings.FrameDisplayDeltaTimeMs && timings.BrowserReceiptTimeMs ? `Browser composite latency (ms): ${timings.FrameDisplayDeltaTimeMs.toFixed(2)}\n` : "";
      latencyStats += browserSideLatency ? `Total browser latency (ms): ${browserSideLatency.toFixed(2)}\n` : "";
      latencyStats += endToEndLatency ? `Total latency (ms): ${endToEndLatency.toFixed(2)}\n` : "";

      console.log(latencyStats);
    }
  }

  convBufferToString(buf) {
    try {
      return String.fromCharCode.apply('', new Uint16Array(buf));
    } catch (e) {
      // 奇数のデータサイズで文字列に変換できなかった場合に
      // 最初の 1 byte を削除して文字に変換する。
      try {
          let buffer = buf.slice(1, buf.length);
          return String.fromCharCode.apply('', new Uint16Array(buffer));
      } catch (e) {}
      return '';
    }
  }

///////////////

  /**
   * カメラ切り替え準備の処理結果を UE に通知します。
   * 
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
   sendCameraSwitchPrepareResponse(result, sceneId) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'cameraSwitchPrepareResponse',
        data: {
          result: result,
          playerId: this.playerId,
          metaCommId: this.userInfo.metaCommId,
          sceneId: sceneId
        }
      }
      webRtcPlayerObj.emitCameraSwitchResponse(data);
    }
  }

  /**
   * カメラ切り替え実施の処理結果を UE に通知します。
   * 
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSwitchResponse(result, sceneId) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'cameraSwitchResponse',
        data: {
          result: result,
          playerId: this.playerId,
          metaCommId: this.userInfo.metaCommId,
          sceneId: sceneId
        }
      }
      webRtcPlayerObj.emitCameraSwitchResponse(data);
    }
  }

  /**
   * カメラ切り替えキャンセルの処理結果を UE に通知します。
   * 
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSwitchCancelResponse(result, sceneId) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'cameraSwitchCancelResponse',
        data: {
          result: result,
          playerId: this.playerId,
          metaCommId: this.userInfo.metaCommId,
          sceneId: sceneId
        }
      }
      webRtcPlayerObj.emitCameraSwitchResponse(data);
    }
  }

  /**
   * カメラ選択要求を UE に通知します。
   * 
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSelectRequest(sceneId) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'cameraSelectRequest',
        data: {
          playerId: this.playerId,
          metaCommId: this.userInfo.metaCommId,
          sceneId: sceneId
        }
      }
      webRtcPlayerObj.emitCameraSwitchResponse(data);
    }
  }

  /**
   * カメラ解像度変更を UE に通知します。
   * 
   * @param {int} width 横幅
   * @param {int} height 高さ
   */
  sendCameraSetRes(width, height) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'cameraSetRes',
        data: {
          width,
          height,
        }
      }
      webRtcPlayerObj.emitCameraSetRes(data);
    }
  }
  
  sendMetaCommId() {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      let data = {
        type: 'metaCommId',
        data: {
          metaCommId: this.userInfo.metaCommId,
          playerId: this.playerId
        }
      }
      webRtcPlayerObj.emitCameraSwitchResponse(data);
    }
  }

  sendDataChannelRequest(sceneId) {
    const requestMsg = {
      type: "dataChannelRequest",
      player: this.playerId,
      sceneId: sceneId
    };
    console.log("%c[Outbound SS message (dataChannelRequest)]", "background: lightgreen; color: black", requestMsg);
    this.ws.send(JSON.stringify(requestMsg));
  }

  sendResolution(width, height) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitCommand({ "Resolution.Width": width, "Resolution.Height": height });
    }
  }

  sendStatFPS() {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitCommand({ "Stat.FPS": '' });
    }
  }

  sendConsoleCommand(command) {
    let webRtcPlayerObj = this.getWebRtcPlayer();
    if (webRtcPlayerObj) {
      webRtcPlayerObj.emitCommand({ ConsoleCommand: command });
    }
  }
}
