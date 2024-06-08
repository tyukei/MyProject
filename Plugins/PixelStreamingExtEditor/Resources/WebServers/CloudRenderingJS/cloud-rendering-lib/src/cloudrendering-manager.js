'use strict';

import { CloudRendering } from './cloudrendering.js'

/**
 * カメラ切り替え時の close コードを定義します。
 */
const WS_CODE_CAMERA_CAHNAGE = 3001;

/**
 * カメラ切り替えのタイムアウトを管理するタイマー.
 * 
 * @private
 */
class CameraSwitchTimer {
  constructor() {
    this.timer = null;
  }

  isRunning() {
    return this.timer != null;
  }

  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  start(func, timeout = 60 * 1000) {
    this.clear();
    this.timer = setTimeout(() => {
      func();
      this.timer = null;
    }, timeout);
  }
}

/**
 * 複数のPixelStreaming拡張版の管理・操作を行うためのクラス。
 * 
 * <p>
 * cloud-rendering-lib では、id が video-container のタグを探して、video タグを追加します。<br>
 * 必ず、HTML には、id="video-container" を持つ div タグを用意してください。
 * </p>
 * <p>以下のような感じで、video タグを追加します。</p>
 * <pre>
 * let container = document.getElementById('video-container');
 * this.video = this.createWebRtcVideo();
 * container.appendChild(this.video);
 * </pre>
 * 
 * <p>
 * 以下の Commands を使用するためには、UE プロセスを起動時に -AllowPixelStreamingCommands 
 * をつけて起動する必要があります。
 * </p>
 * <ul>
 * <li>setHudStats</li>
 * <li>setDisableLatencyTester</li>
 * <li>setEncoderTargetBitrate</li>
 * <li>setEncoderMaxBitrateVBR</li>
 * <li>setEncoderDumpDebugFrames</li>
 * <li>setEncoderMinQP</li>
 * <li>setEncoderMaxQP</li>
 * <li>setEncoderRateControl</li>
 * <li>setEncoderEnableFillerData</li>
 * <li>setEncoderMultipass</li>
 * <li>setEncoderH264Profile</li>
 * <li>setWebRTCDegradationPreference</li>
 * <li>setWebRTCFps</li>
 * <li>setWebRTCStartBitrate</li>
 * <li>setWebRTCMinBitrate</li>
 * <li>setWebRTCMaxBitrate</li>
 * <li>setWebRTCLowQpThreshold</li>
 * <li>setWebRTCHighQpThreshold</li>
 * <li>setWebRTCDisableReceiveAudio</li>
 * <li>setWebRTCDisableTransmitAudio</li>
 * <li>setWebRTCDisableAudioSync</li>
 * </ul>
 * 
 * @example
 *   // 複数のシグナリングサーバを保持
 *   // それらのシグナリングサーバに紐づく sceneId のリストを保持
 *   this.options = [
 *     {
 *       uri: 'ws://192.168.2.37',
 *       sceneIds: ['104']
 *     },
 *     {
 *       uri: 'ws://192.168.2.37:8000',
 *       sceneIds: ['105', '106']
 *     },
 *   ];
 * 
 *   this.userInfo = {
 *     metaCommId: 'xxxxxxxxxx',
 *     jwtToken: 'xxxxxx'
 *   }
 * 
 *   this.crMgr = new CloudRenderingManager(this.userInfo, this.options);
 * 
 *   // UE からのメッセージを受信
 *   this.crMgr.onReceivedCustomMessage = (message) => {
 *     console.log("onReceivedCustomMessage", message);
 *   }
 * 
 *   // カメラ切り替えイベント
 *   this.crMgr.onSceneChanged = (sceneId) => {
 *    this.onSceneChanged(sceneId);
 *   }
 * 
 *   // keydown イベント
 *   document.addEventListener('keydown', (e) => {
 *     if (e.code === 'ArrowDown' || e.code === 'KeyS') {
 *       this.crMgr.pressMoveBack();
 *     } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
 *       this.crMgr.pressMoveLeft();
 *     } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
 *       this.crMgr.pressMoveRight();
 *     } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
 *       this.crMgr.pressMoveFront();
 *     } else if (e.code === 'Space') {
 *       this.crMgr.jump();
 *     }
 *   }, false);
 * 
 *   // keyup イベント
 *   document.addEventListener('keyup', (e) => {
 *    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
 *      this.crMgr.releaseMoveBack();
 *    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
 *      this.crMgr.releaseMoveLeft();
 *    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
 *      this.crMgr.releaseMoveRight();
 *    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
 *      this.crMgr.releaseMoveFront();
 *    } else if (e.code === 'Space') {
 *    }
 *  }, false);
 * 
 *  // ビットレートを設定
 *  this.crMgr.setEncoderTargetBitrate(2 * 1024 * 1024);
 *
 *  // UIInteraction を送信
 *  this.crMgr.sendUIInteraction({"type": "alert", "playerId": "123"});
 * @class
 */
export class CloudRenderingManager {
  /**
   * CloudRenderingManager のインスタンスを作成します。
   * <p>
   * 第1引数のユーザ情報には、以下のように metaCommId と jwtToken を格納します。<br>
   * これらの値は、シグナリングサーバにおいて JWT 検証に使用されます。<br>
   * 第2引数のオプションには、シグナリングサーバとシーンIDの配列を格納します。
   * </p>
   * 
   * @constructor
   * @param {Object} userInfo ユーザ情報
   * @param {Array} options シグナリングサーバなどの情報を格納する配列
   */
  constructor (userInfo, options) {
    this.userInfo = userInfo;
    this.playerId = null;
    this.options = options;

    // 選択されている PixelStreaming の設定など
    this.cr = null;
    this.currentOption = null;
    this.currentSceneId = null;

    // 次に移動する Pixel Streaming の設定など
    this.nextCr = null;
    this.nextOption = null;
    this.nextSceneId = null;

    // カメラ切り替えのタイムアウトを管理するタイマー
    this.cameraSwitchTimer = new CameraSwitchTimer();

    // 映像のミュート設定、デフォルトは true (ON) にしておきます。
    // Safari では、音声有りの場合に映像の自動再生ができません。
    this.muted = true;

    // Move 系イベント間引き送信間隔関連
    this.sendMoveEventIntervalTime = 0;   // Move 系イベント間引き送信間隔(mSec)
    this.lastReceiveTimeMouseMove = 0;    // MouseMove 最終送信時間
    this.lastReceiveTimeTouchMove = 0;    // TouchMove 最終送信時間
    this.lastReceiveTimeLeftAnalog = 0;   // 左アナログスティック最終送信時間
    this.lastReceiveTimeRightAnalog = 0;  // 右アナログスティック最終送信時間
  }

  /**
   * 設定されているオプションの URI と同じかチェックを行います。
   * 
   * @private
   * @param {String} uri URI
   * @returns 接続しているURIと同じ場合はtrue、それ以外はfalse
   */
  isSameUri(uri) {
    return this.cr && this.currentOption && this.currentOption.uri === uri;
  }

  /**
   * CloudRenderingのインスタンスを作成します。
   * 
   * @private
   * @returns CloudRenderingのインスタンス
   */
  createCloudRendering() {
    let cr = new CloudRendering(this.userInfo);
    cr.onPlayerId = (message) => {
      // PlayerId を設定します。
      this.playerId = message.playerId;
      if (typeof(this.onPlayerId) == 'function') {
        this.onPlayerId(message.playerId);
      }
    };
    cr.onPlayerCount = (msg) => {
      if (typeof(this.onPlayerCount) == 'function') {
        this.onPlayerCount(msg.count);
      }
    }
    cr.onStreamerList = (msg) => {
      if (typeof(this.onStreamerList) == 'function') {
        this.onStreamerList(msg);
      }
    }
    cr.onStreamerReady = (msg) => {
      if (typeof(this.onStreamerReady) == 'function') {
        this.onStreamerReady(msg);
      }
    }
    cr.onReceivedCustomMessage = (message) => {
      if (typeof(this.onReceivedCustomMessage) == 'function') {
        this.onReceivedCustomMessage(message);
      }
    };
    cr.onReceivedResponse = (response) => {
      if (typeof(this.onReceivedResponse) == 'function') {
        this.onReceivedResponse(response);
      }
    };
    cr.onReceivedCommand = (command) => {
      if (typeof(this.onReceivedCommand) == 'function') {
        this.onReceivedCommand(command);
      }
    };
    cr.onReceivedInitialSettings = (settings) => {
      if (typeof(this.onReceivedInitialSettings) == 'function') {
        this.onReceivedInitialSettings(settings);
      }
    };
    cr.onReceivedCameraSwitchRequest = (msg) => {
      if (typeof(this.onReceivedCameraSwitchRequest) == 'function') {
        this.onReceivedCameraSwitchRequest(msg);
      }
    };
    cr.onIceDisconnected = () => {
      this.disconnect();
      this.onWSClose({code:0, reason: 'Ice disconnected.'});
    };
    cr.onWebRtcDisconnectScene = (msg) => {
      if (typeof(this.onDisconnectScene) == 'function') {
        this.onDisconnectScene(msg);
      }
    }
    return cr;
  }

  /**
   * 接続されているかを確認します。
   * 
   * @returns 接続されている場合はtrue、それ以外はfalse
   */
  isConnected() {
    return this.cr && this.cr.isOpenWebsocket();
  }

  /**
   * シグナリングサーバに接続を行います。
   * @param {String} wsUrl シグナリングサーバへの URL
   * @returns Promise
   */
  connectSS(wsUrl) {
    let option = this.getOptionByWsUrl(wsUrl);
    return new Promise((resolve, reject) => {
      // シグナリングサーバに接続されていないので、 ここで新規に接続を行います。
      this.cr = this.createCloudRendering();
      this.cr.onWSConnected = () => {
        resolve();
      }
      this.cr.onWSClose = (event) => {
        reject(event);
        this.cr.close();
        this.cr = null;
      }
      this.cr.onWSError = (event) => {
        reject(event);
        this.cr.close();
        this.cr = null;
      }
      this.cr.connect(wsUrl);
      this.currentOption = option;
    });
  }

  /**
   * 指定された SceneId に接続を行います。
   * 
   * @param {String} sceneId シーンID
   * @returns Promise
   */
  connect(sceneId) {
    return new Promise((resolve, reject) => {
      this.connectInternal(sceneId).then(() => {
        this.currentSceneId = sceneId;
        this.nextSceneId = undefined;
        this.sendCameraSelectRequest(this.currentSceneId);
        if (typeof(this.onSceneChanged) == 'function') {
          this.onSceneChanged(sceneId);
        }
        resolve();
      }).catch((msg) => {
        reject(msg);
      });
    });
  }

  /**
   * シーン ID が含まれるオプションを取得します。
   * <p>
   * 一致するシーンIDが存在しない場合には null を返却します。
   * </p>
   * @param {String} sceneId シーンID
   * @returns シーン ID が含まれるオプション
   */
  getOption(sceneId) {
    for (let option of this.options) {
      for (let id of option.sceneIds) {
        if (sceneId == id) {
          return option;
        }
      }
    }
    return null;
  }

  /**
   * シグナリングサーバの URL が含まれるオプションを取得します。
   * <p>
   * 一致するシグナリングサーバの URL が存在しない場合には null を返却します。
   * </p>
   * @param {String} wsUrl シグナリングサーバの URL
   * @returns シグナリングサーバの URL が含まれるオプション
   */
  getOptionByWsUrl(wsUrl) {
    for (let option of this.options) {
      if (wsUrl == option.uri) {
        return option;
      }
    }
    return null;
  }

  /**
   * サーバ設定のオプションを設定します。
   * @param {Object} options サーバ設定のオプション
   */
  setOptions(options) {
    this.options = options;
  }

  /**
   * 指定された SceneId に接続を行います。
   * 
   * @private
   * @param {String} sceneId シーンID
   * @returns Promise
   */
  connectInternal(sceneId) {
    return new Promise((resolve, reject) => {
      if (this.currentSceneId == sceneId) {
        // 同じ sceneId への移動は reject します。
        reject();
        return;
      }

      // TODO: serverOptions にあるscene にしか接続出来ない
      // 三人称カメラの場合もここで判定するのはマズイかもサーバの接続も考えると、別の関数を用意した方が良いかもしれない。
      let option = this.getOption(sceneId);
      if (option) {
        // シグナリングサーバの URI が違う場合には接続し直す。
        // ダブルバッファリングにする。
        let switchServerFlag = (this.cr != null && !this.isSameUri(option.uri));
        if (switchServerFlag) {
          console.log('Switch signalling server.');
          if (this.currentOption) {
            console.log('    old signalling server: ' + this.currentOption.uri);
          }
          console.log('    new signalling server: ' + option.uri);

          // シグナリングサーバを切り替えます。
          this.nextCr = this.createCloudRendering();
          this.nextCr.onWSConnected = () => {
            if (this.nextCr) {
              this.nextCr.connectWebRtcPlayer(sceneId, true);
            }
          }
          this.nextCr.onVideoPlaying = (videoElem) => {
            resolve();
            this.nextCr.onWSError = this.onWSError;
            this.nextCr.onWSClose = this.onWSClose;
            this.onVideoPlaying(videoElem);
          }
          this.nextCr.onWSClose = (event) => {
            reject(event);
            this.nextCr.close();
            this.nextCr = null;
          }
          this.nextCr.onWSError = (event) => {
            reject(event);
            this.nextCr.close();
            this.nextCr = null;
          }
          this.nextCr.connect(option.uri);
          this.nextOption = option;
          this.nextSceneId = sceneId;
        } else {
          if (this.cr == null || !this.cr.isOpenWebsocket()) {
            // シグナリングサーバに接続されていないので、
            // ここで新規に接続を行います。
            this.cr = this.createCloudRendering();
            this.cr.onWSConnected = () => {
              if (this.cr) {
                this.cr.connectWebRtcPlayer(sceneId, true);
              }
            }
            this.cr.onVideoPlaying = (videoElem) => {
              resolve();
              this.cr.onWSError = this.onWSError;
              this.cr.onWSClose = this.onWSClose;
              this.onVideoPlaying(videoElem);
            }
            this.cr.onWSClose = (event) => {
              reject(event);
              this.cr.close();
              this.cr = null;
            }
            this.cr.onWSError = (event) => {
              reject(event);
              this.cr.close();
              this.cr = null;
            }
            this.cr.connect(option.uri);
            this.currentOption = option;
            this.currentSceneId = sceneId;
          } else {
            // 既にシグナリングサーバに接続しているので、
            // カメラの切り替えのみ行うようにします。
            this.cr.onVideoPlaying = (videoElem) => {
              resolve();
              this.cr.onWSError = this.onWSError;
              this.cr.onWSClose = this.onWSClose;
              this.onVideoPlaying(videoElem);
            }
            this.cr.connectWebRtcPlayer(sceneId, true);
            this.nextSceneId = sceneId;
          }
        }
      } else {
        reject('Not found sceneId=' + sceneId);
      }
    })
  }

  /**
   * シグナリングサーバとの接続やカメラへの接続を全て切断します。
   */
  disconnect() {
    console.log('cloudrendering-manager disconnect.');

    if (this.cr) {
      this.cr.close();
    }

    if (this.nextCr) {
      this.nextCr.close();
    }

    this.cameraSwitchTimer.clear();
    this.cr = null;
    this.currentOption = null;
    this.currentSceneId = null;
    this.nextCr = null;
    this.nextOption = null;
    this.nextSceneId = null;
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
   * DataChannel 経由で送られてきたメッセージを処理します。
   * 
   * @param {String} message メッセージ
   */
   onReceivedCustomMessage(message) {
    console.log('onReceivedCustomMessage', message);
  }

  /**
   * シーン切り替えイベント受信した時の処理を行います。
   * 
   * @param {String} sceneId シーンID
   */
  onRequestSwitchCamera(sceneId) {
    console.log('onRequestSwitchCamera is not implements.', sceneId);
  }

  /**
   * シーン切り替えイベント受信した時の処理を行います。
   * 
   * @param {String} sceneId シーンID
   */
  onSceneChanged(json) {
    console.log('onSceneChanged is not implements.', json);
  }

  /**
   * 映像再生開始時イベントを受信した時の処理を行います。
   * 
   * @param {HTMLVideoElement} videoElem 映像エレメント
   */
  onVideoPlaying(videoElem) {
    console.log('onVideoPlaying is not implements.', videoElem);
  }

  /**
   * Websocket でエラーが発生した時の処理を行います。
   * 
   * @param {Object} event 
   */
  onWSError(event) {
    console.log('onWSError is not implements.', event);
  }

  /**
   * Websocket が切断された時の処理を行います。
   */
  onWSClose(event) {
    console.log('onWSClose is not implements.', event);
  }

////////////

  /**
   * カメラ切り替え準備の処理結果をUEに通知します。
   * 
   * @private
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
   sendCameraSwitchPrepareResponse(result, sceneId) {
    if (this.cr) {
      this.cr.sendCameraSwitchPrepareResponse(result, sceneId);
    }
  }

  /**
   * カメラ切り替え実施の処理結果をUEに通知します。
   * 
   * @private
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSwitchResponse(result, sceneId) {
    if (this.cr) {
      this.cr.sendCameraSwitchResponse(result, sceneId);
    }
  }

  /**
   * カメラ切り替え完了の処理結果をUEに通知します。
   * 
   * @private
   * @param {Boolean} result 処理結果の成否
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSwitchCancelResponse(result, sceneId) {
    if (this.cr) {
      this.cr.sendCameraSwitchCancelResponse(result, sceneId);
    }
  }

  /**
   * カメラ切り替えイベントをUEに通知します。
   * また、カメラを切り替えたので、非表示にしていた映像を表示します。
   * 
   * @private
   * @param {String} sceneId 切替先のカメラID
   */
  sendCameraSelectRequest(sceneId) {
    if (this.cr) {
      this.cr.sendCameraSelectRequest(sceneId);
      // WebRTC プレイヤーを表示します。
      this.cr.setWebRtcPlayerVisibility(sceneId);
      this.cr.setVideoMuted(sceneId, this.muted);
    }
  }
  
  /**
   * カメラ解像度変更を UE に通知します。
   * 
   * @private
   * @param {int} width 横幅
   * @param {int} height 高さ
   */
  sendCameraSetRes(width, height) {
    if (this.cr) {
      this.cr.sendCameraSetRes(width, height);
    }
  }

  /**
   * UE からカメラ切り替えの要求を受信したことを通知します。
   * 
   * カメラ切り替え準備
   * <pre>
   * type : "cameraSwitchPrepareRequest",
   * data : {
   *     sceneId : xxxxxx
   * }
   * カメラ切り替え実施
   * 
   * type : "cameraSwitchRequest",
   * data : {
   *     sceneId : xxxxxx
   * }
   * カメラ切り替え完了
   * 
   * type : "cameraSwitchCancelRequest",
   * data : {
   *     sceneId : xxxxxx
   * }
   * カメラ切り替え実施応答
   * 
   * type : "cameraSwitchResponse",
   * data : {
   *     result : true / false
   * }
   * </pre>
   * 
   * @private
   * @param {String} イベント種別
   * @param {Object} イベントデータ
   */
   onReceivedCameraSwitchRequest(msg) {
    console.log('onReceivedCameraSwitchRequest', msg);
      
    let json;
    try {
      json = JSON.parse(msg);
    } catch(e) {
      console.log("onReceivedCameraSwitchRequest" , e);
      return;
    }

    switch (json.type) {
    default:
    {
      console.log("Unknown type. type=" + json.type);
      break;
    }
    case 'cameraSwitchPrepareRequest':
    {
      // ここで、もう一つのサーバと接続を行う。
      let sceneId = json.data.sceneId;
      this.onCameraSwitchPrepareRequest(sceneId);
      break;
    }
    case 'cameraSwitchRequest':
    {
      // 画面を切り替える
      let sceneId = json.data.sceneId;
      this.onCameraSwitchRequest(sceneId);
      break;
    }
    case 'cameraSwitchCancelRequest':
    {
      // キャンセル処理を行う
      let sceneId = json.data.sceneId;
      this.onCameraSwitchCancelRequest(sceneId);
      break;
    }
    }
  }

  /**
   * カメラ切り替え準備要求が送られてきた時の処理を行います。
   * 
   * @private
   * @param {String} sceneId シーンID
   */
  onCameraSwitchPrepareRequest(sceneId) {
    // 既にカメラが準備中の場合は、falseを返却します。
    if (this.nextSceneId) {
      // 切り替え先が同じ場合には、特に処理を行わないようにします。
      if (this.nextSceneId == sceneId) {
        return;
      }

      // タイマーをキャンセルします。
      this.cameraSwitchTimer.clear();

      if (this.nextCr) {
        // カメラの切り替えがキャンセルされたので、
        // バックグラウンドで接続したサーバ・カメラを閉じます。
        this.nextCr.close(WS_CODE_CAMERA_CAHNAGE);
      } else if (this.nextSceneId) {
        // カメラの切り替えがキャンセルされたので、
        // バックグラウンドで接続したカメラを閉じます。
        this.cr.closeWebRtcPlayer(this.nextSceneId);
      }

      this.nextCr = null;
      this.nextOption = null;
      this.nextSceneId = null;
    }

    this.connectInternal(sceneId).then(() => {
      this.sendCameraSwitchPrepareResponse(true, sceneId);
      // カメラの準備を行った後に一定時間内に映像が切り替えられなかった
      // 場合には、キャンセル扱いにします。
      this.cameraSwitchTimer.start(() => {
        if (this.nextSceneId && this.nextSceneId == sceneId) {
          console.log('A camera timeout has occurred. sceneId=' + sceneId);
          this.onCameraSwitchCancelRequest(sceneId);
        }
      });
    }).catch(() => {
      this.sendCameraSwitchPrepareResponse(false, sceneId);
    });
  }

  /**
   * カメラ切り替え要求が送られてきた時の処理を行います。
   * 
   * @private
   * @param {String} sceneId シーンID
   */
  onCameraSwitchRequest(sceneId) {
    // タイムアウトを解除します。
    this.cameraSwitchTimer.clear();

    // 切り替え準備した sceneId と違う場合にはエラーを返却します。
    if (!this.nextSceneId || this.nextSceneId != sceneId) {
      if (this.currentSceneId == sceneId) {
        return;
      }
      this.sendCameraSwitchResponse(false, sceneId);
    } else {
      // 切り替え要求が来るまでに、切り替え先の WebRtcPlayer 
      // が接続できていない場合には、切り替え失敗を送信します。
      if (this.nextCr) {
        if (!this.nextCr.isConnectedWebRtcPlayer(sceneId)) {
          this.sendCameraSwitchResponse(false, sceneId);
          return;
        }
      }

      this.sendCameraSwitchResponse(true, sceneId);

      let preCr;
      let preSceneId = this.currentSceneId;

      if (this.nextCr) {
        preCr = this.cr;
        this.cr = this.nextCr;
        this.currentOption = this.nextOption;
        this.currentSceneId = this.nextSceneId;
      } else if (this.nextSceneId) {
        this.currentSceneId = this.nextSceneId;
      }

      // フォーカスしたことを通知します。
      this.sendCameraSelectRequest(this.currentSceneId);

      this.nextCr = null;
      this.nextOption = null;
      this.nextSceneId = null;

      if (preCr) {
        // 接続していたサーバ・カメラを閉じます。
        preCr.close(WS_CODE_CAMERA_CAHNAGE);
      } else if (preSceneId) {
        this.cr.closeWebRtcPlayer(preSceneId);
      }

      // カメラが切り替わったことを通知します。
      if (typeof(this.onSceneChanged) == 'function') {
        this.onSceneChanged(this.currentSceneId);
      }
    }
  }

  /**
   * カメラ切り替えキャンセル要求が送られてきた時の処理を行います。
   * 
   * @private 
   * @param {String} sceneId シーンID
   */
  onCameraSwitchCancelRequest(sceneId) {
    // タイムアウトを解除します。
    this.cameraSwitchTimer.clear();

    if (!this.nextSceneId || this.nextSceneId != sceneId) {
      this.sendCameraSwitchCancelResponse(false, sceneId);
    } else {
      this.sendCameraSwitchCancelResponse(true, sceneId);

      if (this.nextCr) {
        // カメラの切り替えがキャンセルされたので、
        // バックグラウンドで接続したサーバ・カメラを閉じます。
        this.nextCr.close(WS_CODE_CAMERA_CAHNAGE);
      } else if (this.nextSceneId) {
        // カメラの切り替えがキャンセルされたので、
        // バックグラウンドで接続したカメラを閉じます。
        this.cr.closeWebRtcPlayer(this.nextSceneId);
      }

      this.nextCr = null;
      this.nextOption = null;
      this.nextSceneId = null;
    }
  }

/////////////

  /**
   * UIInteraction を送信します。
   * 
   * @param {Object} descriptor 
   */
  sendUIInteraction(descriptor) {
    if (this.cr) {
      this.cr.sendUIInteraction(descriptor);
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
    if (this.cr) {
      this.cr.sendOSC(path, type, data);
    }
  }

  /**
   * LatencyTest を送信します。
   * 
   * @param {Object} descriptor 
   */
  sendLatencyTest(descriptor) {
    if (this.cr) {
      this.cr.sendLatencyTest(descriptor);
    }
  }

  /**
   * QualityControl を送信します。
   * 
   */
  requestQualityControl() {
    if (this.cr) {
      this.cr.requestQualityControl();
    }
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー登録
   * @param {String} name 登録識別子
   * @param {Function} listener リスナー関数
   */
  addVideoEncoderQPListener(name, listener) {
    if (this.cr) {
      this.cr.addVideoEncoderQPListener(name, listener);
    }
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー解除
   * @param {String} name 解除識別子
   */
  removeVideoEncoderQPListener(name) {
    if (this.cr) {
      this.cr.removeVideoEncoderQPListener(name);
    }
  }

  /**
   * ビデオエンコーダ量子化パラメータリスナー全解除
   */
  clearVideoEncoderQPListener() {
    if (this.cr) {
      this.cr.clearVideoEncoderQPListener();
    }
  }

  /**
   * 左のアナログスティックのX値を送信します。
   * 
   * @param {Number} x アナログスティックのX軸値(-1.0 〜 1.0)
   * @param {Number} y アナログスティックのY軸値(-1.0 〜 1.0)
   */
  leftAnalog(x, y) {
    let currentTime = Date.now();
    let interval = currentTime - this.lastReceiveTimeLeftAnalog;
    
    if (interval >= this.sendMoveEventIntervalTime) {
      if (this.cr) {
        this.cr.leftAnalog(x, y);
      }
      this.lastReceiveTimeLeftAnalog = currentTime;
    }
  }

  /**
   * 右のアナログスティックの値を送信します。
   * 
   * @param {Number} x アナログスティックのX軸値(-1.0 〜 1.0)
   * @param {Number} y アナログスティックのY軸値(-1.0 〜 1.0)
   */
  rightAnalog(x, y) {
    let currentTime = Date.now();
    let interval = currentTime - this.lastReceiveTimeRightAnalog;

    if (interval >= this.sendMoveEventIntervalTime) {
      if (this.cr) {
        this.cr.rightAnalog(x, y);
      }
      this.lastReceiveTimeRightAnalog = currentTime;
    }
  }

  /**
   * ジャンプイベントを送信します。
   */
  jump() {
    if (this.cr) {
      this.cr.jump();
    }
  }

  stopJump() {
    if (this.cr) {
      this.cr.stopJump();
    }
  }

  mouseDown(button, x,y) {
    console.log("call mouseDown(%d, %d, %d)", button, x, y);
    if (this.cr) {
      this.cr.pressMouseButtons(button, x, y);
    }
  }

  mouseMove(x,y,dx,dy) {
//    console.log("call mouseMove(%d, %d, %d, %d)", x, y, dx, dy);
    let currentTime = Date.now();
    let interval = currentTime - this.lastReceiveTimeMouseMove;

    if (interval >= this.sendMoveEventIntervalTime) {
      if (this.cr) {
        this.cr.moveMouseButtons(x, y, dx, dy);
      }
      this.lastReceiveTimeMouseMove = currentTime;
    }
  }

  mouseUp(button,x,y) {
    console.log("call mouseUp(%d, %d, %d)", button, x, y);
    if (this.cr) {
      this.cr.releaseMouseButtons(button, x, y);
    }
  }

  mouseEnter() {
    console.log("call mouseEnter()");
    if (this.cr) {
      this.cr.mouseEnter();
    }
  }

  mouseLeave() {
    console.log("call mouseLeave()");
    if (this.cr) {
      this.cr.mouseLeave();
    }
  }

  touchStart(touches) {
    if (this.cr) {
      this.cr.touchStart(touches);
    }
  }

  touchMove(touches) {
    let currentTime = Date.now();
    let interval = currentTime - this.lastReceiveTimeTouchMove;

    if (interval >= this.sendMoveEventIntervalTime) {
      if (this.cr) {
        this.cr.touchMove(touches);
      }
      this.lastReceiveTimeTouchMove = currentTime;
    }
  }

  touchEnd(touches) {
    if (this.cr) {
      this.cr.touchEnd(touches);
    }
  }

  /**
   * マウスのクリックイベントを送信します。
   * @param {int8} button ボタン種別 
   * @param {int16} x ウィンドウ X 絶対座標 
   * @param {int16} y ウィンドウ y 絶対座標
   */
//  mouseClick(button, x, y) {
//    console.log("call mouseClick(%d, %d, %d)", button, x, y);
//    if (this.cr) {
//      this.cr.pressMouseButtons(button, x, y);
//    }
//  }

  /**
   * 前進開始イベントを送信します。
   */
  pressMoveFront() {
    if (this.cr) {
      this.cr.pressMoveFront();
    }
  }

  /**
   * 前進停止イベントを送信します。
   */
   releaseMoveFront() {
    if (this.cr) {
      this.cr.releaseMoveFront();
    }
  }

  /**
   * 後進開始イベントを送信します。
   */
  pressMoveBack() {
    if (this.cr) {
      this.cr.pressMoveBack();
    }
  }

  /**
   * 後進停止イベントを送信します。
   */
  releaseMoveBack() {
    if (this.cr) {
      this.cr.releaseMoveBack();
    }
  }

  /**
   * 左進開始イベントを送信します。
   */
  pressMoveLeft() {
    if (this.cr) {
      this.cr.pressMoveLeft();
    }
  }

  /**
   * 左進停止イベントを送信します。
   */
  releaseMoveLeft() {
    if (this.cr) {
      this.cr.releaseMoveLeft();
    }
  }

  /**
   * 右進開始イベントを送信します。
   */
  pressMoveRight() {
    if (this.cr) {
      this.cr.pressMoveRight();
    }
  }

  /**
   * 右進停止イベントを送信します。
   */
   releaseMoveRight() {
    if (this.cr) {
      this.cr.releaseMoveRight();
    }
  }

  //// 
  
  /**
   * 解像度を変更します。
   * <p>
   * ここで変更できる解像度は、UEアプリのウィンドウのサイズになりますので、
   * PSExt プラグインのカメラには影響がありません。
   * <pre>
   * this.crMgr.sendResolution(640, 480);
   * </pre>
   * </p>
   * @param {int} width ウィンドウの横幅
   * @param {int} height ウィンドウの縦幅
   */
  sendResolution(width, height) {
    if (this.cr) {
      this.cr.sendResolution(width, height);
    }
  }

  /**
   * FPS の情報を UE アプリ上に表示します。
   * <p>
   * UE アプリ上に FPS 情報が表示されますので、
   * PSExt プラグインのカメラには影響がありません。
   * <pre>
   * this.crMgr.sendStatFPS();
   * </pre>
   * </p>
   */
  sendStatFPS() {
    if (this.cr) {
      this.cr.sendStatFPS();
    }
  }

  //// Commands

  /**
   * ConsoleCommand を実行します。
   * <p>
   * 起動引数に以下の設定を行う必要があります。
   * <pre>
   * -AllowPixelStreamingCommands=true
   * </pre>
   * <pre>
   * this.crMgr.sendConsoleCommand('stat fps');
   * </pre>
   * </p>
   * @param {String} command コンソールコマンド
   */
  sendConsoleCommand(command) {
    if (this.cr) {
      this.cr.sendConsoleCommand(command);
    }
  }

  /**
   * ゲーム内 HUD への PixelStreaming ステータス表示設定を行います。
   * 
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setHudStats(param) {
    if (this.cr) {
      return this.cr.setHudStats(param);
    }
    return false;
  }

  /**
   * レイテンシテストのトリガー機能無効化設定を行います。
   * 
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setDisableLatencyTester(param) {
    if (this.cr) {
      return this.cr.setDisableLatencyTester(param);
    }
    return false;
  }

  /**
   * ターゲットビットレートの設定を行います。
   * 
   * Commands を使用するためには、UE プロセスを起動時に -AllowPixelStreamingCommands 
   * をつけて起動する必要があります。
   * 
   * @param {number} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderTargetBitrate(bitrate) {
    if (this.cr) {
      return this.cr.setEncoderTargetBitrate(bitrate);
    }
    return false;
  }

  /**
   * 最大ビットレートの設定を行います。
   * 
   * @param {number} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMaxBitrateVBR(bitrate) {
    if (this.cr) {
      return this.cr.setEncoderMaxBitrateVBR(bitrate);
    }
    return false;
  }

  /**
   * フレームデータダンプ機能設定（デバッグ用）を行います。
   * 
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderDumpDebugFrames(param) {
    if (this.cr) {
      return this.cr.setEncoderDumpDebugFrames(param);
    }
    return false;
  }

  /**
   * 最小量子化パラメータの設定を行います。
   * 
   * @param {number} minQP 最小量子化パラメータ（-1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMinQP(minQP) {
    if (this.cr) {
      return this.cr.setEncoderMinQP(minQP);
    }
    return false;
  }

  /**
   * 最大量子化パラメータの設定を行います。
   * @param {number} maxQP 最大量子化パラメータ（-1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMaxQP(maxQP) {
    if (this.cr) {
      return this.cr.setEncoderMaxQP(maxQP);
    }
    return false;
  }

  /**
   * エンコーダの RateControl モード設定を行います。
   * @param {string} mode モード（ConstQP / VBR / CBR）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderRateControl(mode) {
    if (this.cr) {
      return this.cr.setEncoderRateControl(mode);
    }
    return false;
  }

  /**
   * ビットレート維持用ジャンクデータ挿入設定を行います。
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderEnableFillerData(param) {
    if (this.cr) {
      return this.cr.setEncoderEnableFillerData(param);
    }
    return false;
  }

  /**
   * エンコーダマルチパスモード設定を行います。
   * @param {string} mode モード（DISABLED / QUARTER / FULL）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderMultipass(mode) {
    if (this.cr) {
      return this.cr.setEncoderMultipass(mode);
    }
    return false;
  }

  /**
   * H264 プロファイル設定を行います。
   * @param {string} profile プロファイル名(AUTO / BASELINE / MAIN / HIGH / HIGH444 / STEREO / SVC_TEMPORAL_SCALABILITY / PROGRESSIVE_HIGH / CONSTRAINED_HIGH)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setEncoderH264Profile(profile) {
    if (this.cr) {
      return this.cr.setEncoderH264Profile(profile);
    }
    return false;
  }

  /**
   * 画質劣化の優先度設定を行います。
   * @param {string} mode モード（BALANCED / MAINTAIN_FRAMERATE / MAINTAIN_RESOLUTION）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCDegradationPreference(mode) {
    if (this.cr) {
      return this.cr.setWebRTCDegradationPreference(mode);
    }
    return false;
  }

  /**
   * 最大FPS設定を行います。
   * @param {number} fps FPS 
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCFps(fps) {
    if (this.cr) {
      return this.cr.setWebRTCFps(fps);
    }
    return false;
  }

  /**
   * ストリーミング開始時のビットレート設定を行います。
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCStartBitrate(bitrate) {
    if (this.cr) {
      return this.cr.setWebRTCStartBitrate(bitrate);
    }
    return false;
  }

  /**
   * 最小ビットレート設定を行います。
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCMinBitrate(bitrate) {
    if (this.cr) {
      return this.cr.setWebRTCMinBitrate(bitrate);
    }
    return false;
  }

  /**
   * 最大ビットレート設定を行います。
   * @param {*} bitrate ビットレート(bps)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCMaxBitrate(bitrate) {
    if (this.cr) {
      return this.cr.setWebRTCMaxBitrate(bitrate);
    }
    return false;
  }

  /**
   * 量子化パラメータ下位閾値設定を行います。
   * @param {number} value 量子化パラメータ（-1 or 1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCLowQpThreshold(value) {
    if (this.cr) {
      return this.cr.setWebRTCLowQpThreshold(value);
    }
    return false;
  }

  /**
   * 量子化パラメータ上位閾値設定を行います。
   * @param {number} value 量子化パラメータ（-1 or 1～51）
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCHighQpThreshold(value) {
    if (this.cr) {
      return this.cr.setWebRTCHighQpThreshold(value);
    }
    return false;
  }

  /**
   * ブラウザから UE へのオーディオ受信の無効化設定を行います。
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
  setWebRTCDisableReceiveAudio(param) {
    if (this.cr) {
      return this.cr.setWebRTCDisableReceiveAudio(param);
    }
    return false;
  }

  /**
   * UE オーディオのブラウザへの送信無効化設定を行います。
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setWebRTCDisableTransmitAudio(param) {
    if (this.cr) {
      return this.cr.setWebRTCDisableTransmitAudio(param);
    }
    return false;
  }

  /**
   * WebRTCのオーディオトラックとビデオトラックの同期無効化設定を行います。
   * @param {boolean} param true(有効) / false(無効)
   * @returns true (正常終了) / false(パラメータ不正)
   */
   setWebRTCDisableAudioSync(param) {
    if (this.cr) {
      return this.cr.setWebRTCDisableAudioSync(param);
    }
    return false;
  }

  /**
   * 初期設定要求を行います。
   */
  requestInitialSettings() {
    if (this.cr) {
      this.cr.requestInitialSettings();
    }
  }

  /**
   * Video のミュート設定を取得します。
   * @returns true(ミュートON) / false(ミュートOFF)
   */
  isVideoMuted() {
    return this.muted;
  }

  /**
   * Video のミュート設定を行います。
   * @param {boolean} muted true(ミュートON) / false(ミュートOFF)
   */
  setVideoMuted(muted) {
    this.muted = muted;

    if (this.cr) {
      this.cr.setVideoMuted(this.currentSceneId, muted);
    }
  }

  /**
   * Move 系イベント間引き送信間隔設定を行います。
   * @param {number} interval Move 系イベント間引き送信間隔(mSec)
   */
  setMoveEventInterval(interval) {
    if (interval >= 0) {
      this.sendMoveEventIntervalTime = interval;
      console.log("set sendMoveEventIntervalTime: ", this.sendMoveEventIntervalTime);
    }
  }
}
