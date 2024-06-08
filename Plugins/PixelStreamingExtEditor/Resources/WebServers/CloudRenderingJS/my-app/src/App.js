import React from 'react';
import Menu from "./Menu";
import VSitck from "./VStick";
import LoginDialog from "./LoginDialog";
import RandomWalk from "./RandomWalk";
import InputEventManager from "./InputEventManager";
import InputEventCommand from "./InputEventCommand";
import { toggleFullscreen } from './Utils.js'
import { CameraMode, CloudRenderingManager } from 'cloudrendering'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

class SimpleTimer {
  constructor() {
    this.timer = null;
  }

  isRunning() {
    return this.timer != null;
  }

  clear() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  start(func, interval = 200) {
    this.clear();
    this.timer = setInterval(() => {
      func();
    }, interval);
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoginDialogOpen: true,
      isDataChannelOpen: false,
      isShownInfo: false,
      metaCommId: '',
      playerId: '',
      dataChannelMessage: ''
    };

    this.crMgr = undefined;
    this.options = undefined;
    this.userInfo = undefined;
    this.sceneId = undefined;
    this.jumpTest = new SimpleTimer();
    this.walkTest = null;
    this.muted = false;
    this.scalingScreenMode = true; // デフォルトの表示モードを Scaling 方式に設定
    this.touchTest = new SimpleTimer();

    // マウス・タッチイベント管理クラス
    this.inputEventMgr = new InputEventManager();
    this.inputEventMgr.onMouseDown = this.handleMouseDown;
    this.inputEventMgr.onMouseUp  = this.handleMouseUp;
    this.inputEventMgr.onMouseMove = this.handleMouseMove;
    this.inputEventMgr.onTouchStart = this.handleTouchStart;
    this.inputEventMgr.onTouchMove = this.handleTouchMove;
    this.inputEventMgr.onTouchEnd = this.handleTouchEnd;
    this.inputEventMgr.setScalingScreenMode(this.scalingScreenMode);

    // マウス・タッチイベント確認用クラス
    this.inputEventCommand = new InputEventCommand();
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    this.disconnectPS();
  }

  connectPS() {
    if (this.crMgr) {
      console.log('this.crMgr is already connected.');
      return;
    }

    this.crMgr = new CloudRenderingManager(this.userInfo, this.options);
    this.crMgr.onWSClose = () => {
      // websocket が切断された場合に呼び出されます。
      this.disconnectPS();
      this.setState({
        isLoginDialogOpen: true
      });
    }

    // Video再生時
    this.crMgr.onVideoPlaying = (video) => {
      if (video) {
        // ViewPortのアスペクト比変更時
        const listener = (event) => {
          this.aspectflip = this.videoAspect > 1 ? event.matches : !event.matches;
          this.handleScalingScreenMode(this.scalingScreenMode);
        };
        // Aspect比再設定
        const resetAspect = () => {
          this.videoAspect = video.videoWidth / video.videoHeight;
          this.mediaQuery = window.matchMedia(`(min-aspect-ratio: ${this.videoAspect})`);
          let matches = this.mediaQuery.matches;
          this.aspectflip = this.videoAspect > 1 ? matches : !matches;
          this.mediaQuery.addEventListener('change', listener);
          this.handleScalingScreenMode(this.scalingScreenMode);
        };
        // Videoタグリサイズ時
        video.addEventListener("resize", (ev) => {
          this.mediaQuery.removeEventListener('change', listener);
          resetAspect();
        });
        resetAspect();
      }
    }

    this.crMgr.onPlayerId = (playerId) => {
      this.setState({
        playerId: playerId
      });
      // ビデオエンコーダ量子化パラメータ受信リスナー登録
      this.crMgr.addVideoEncoderQPListener(playerId, (avg) => {
        this.setState({
          qp: avg
        });
      });
    }

    this.crMgr.onPlayerCount = (playerCount) => {
      console.log("playerCount: " + playerCount);
    }

    this.crMgr.onReceivedCustomMessage = (message) => {
      console.log("onReceivedCustomMessage", message);

      // TODO: メッセージの処理を行う。

      let json;
      try {
        json = JSON.parse(message);
      } catch(e) {
        console.log('Invalid format. message=' + message);
        this.addDataChannelMessage(message);
        return;
      }

      switch (json.type) {
        default:
          console.log('Unknown type. type=' + json.type);
          this.addDataChannelMessage(JSON.stringify(json, null, "  "));
          break;
        case 'alert':
        {
          toast('Message: ' + json.message);
          break;
        }
        case 'echo':
        {
          // 送られてきたメッセージを送り返します。
          let response = {
            type: 'response',
            menubar: this.metaCommId,
            message: message
          }
          this.crMgr.sendUIInteraction(response);
          toast('Message: ' + message);
          break;
        }
      }
    }

    this.crMgr.onSceneChanged = (sceneId) => {
      console.log('changed sceneId=' + sceneId);
    }

    // 三人称カメラの場合には、このイベントが呼び出されます。
    this.crMgr.onStreamerReady = (msg) => {
      // カメラの準備が完了したので接続を行います。
      this.crMgr.connect(msg.sceneId);
    }

    // ミュートの設定を行います。
    this.crMgr.setVideoMuted(this.muted);

    if (this.userInfo.cameraMode === CameraMode.Fixed ||
      this.userInfo.cameraMode === CameraMode.Fixed_AI) {
      // 定点カメラに接続を行います。
      this.crMgr.connect(this.sceneId).then(() => {
        console.log('Success to connect.');
      }).catch((msg) => {
        console.log('Failed to connect. ', msg);
        this.disconnectPS();
        this.setState({
          isLoginDialogOpen: true
        });
      });
    } else {
      // オプションにあるシグナリグサーバのURLにアクセスします。
      let wsUrl = this.options[0].uri;
      // 三人称カメラに接続を行います。
      this.crMgr.connectSS(wsUrl).then(() => {
        console.log('Success to connect.');
      }).catch((msg) => {
        console.log('Failed to connect.', msg);
        this.disconnectPS();
        this.setState({
          isLoginDialogOpen: true
        });
      });
    }

    document.addEventListener('keydown', this.handleKeyDown, false)
    document.addEventListener('keyup', this.handleKeyUp, false)
    // ウィンドウからフォーカスが外れたら指定した関数を実行
    window.addEventListener('blur', this.handleWindowBlur, false);

    // マウス・タッチイベントを登録
    this.inputEventMgr.addEventListeners();

    // 表示モードを Scaling 方式に設定
    this.handleScalingScreenMode(this.scalingScreenMode);

    // FPS集計（1秒毎）
    let calcAggregatedFPS = this.generateAggregatedFPSFunction();
    let printAggregatedFPS = () => { 
      if (this.crMgr && this.crMgr.cr) {
        let webRtcPlayerObj = this.crMgr.cr.getWebRtcPlayer();
        if (webRtcPlayerObj) {
          webRtcPlayerObj.getStats(calcAggregatedFPS); 
        }
      }
    }
    this.aggregateFPSIntervalId = setInterval(printAggregatedFPS, 1000 );
  }

  // FPS集計
  generateAggregatedFPSFunction() {
    if (!this.fpsArray) {
      this.fpsArray = [];
    }

    return (stats) => {
      stats.forEach(stat => {
        // FPSを取得
        if (stat.type === 'inbound-rtp' && stat.kind === 'video' && stat.framesPerSecond) {
          if (this.onAggregatedFPS) {
            this.fpsArray.push(stat.framesPerSecond);
            if (this.fpsArray.length > 5) {
              this.fpsArray.shift();
              // 移動平均
              const avg = this.fpsArray.reduce( ( a, b ) => a + b, 0 ) / this.fpsArray.length;
              this.onAggregatedFPS(avg, stat);
            }
          }
        }
      });
    }
  }

  // FPS集計時に自動解像度変更
  onAggregatedFPS(fps, stats) {
    //console.log("onAggregatedFPS: " +  fps);
    this.setState({
      fps: fps
    });
    let size = {
      height: stats.frameHeight,
      width: stats.frameWidth,
    };
    this.setState({
      cameraRes: `w${size.width}/h${size.height}`
    });
    if (!this.state.autoScreenRes) {
      return;
    }

    // FPS集計用オブジェクト初期化
    if (!this.fpsStats) {
      this.fpsStats = {
        counter: 0,
        up: false,
        increase: function (flg) {
          if (flg === this.up) {
            this.counter++;
          } else {
            this.counter = 0;
            this.up = flg;
          }
        }
      };
    }
    // 初期サイズを保持
    if (this.fpsStats.size === undefined) {
      this.fpsStats.size = size;
      this.fpsStats.org = size;
    }
    // 解像度が変更になったらカウンターをリセット
    if (this.fpsStats.size.height !== size.height || this.fpsStats.size.width !== size.width) {
      this.fpsStats.size = size;
      this.fpsStats.counter = 0;
    }
    // 一定時間高品質or低品質が続いたかのチェック
    if (fps > 29) {
      this.fpsStats.increase(true);
    } else if (fps < 20) {
      this.fpsStats.increase(false);
    } else {
      this.fpsStats.counter = 0;
    }
    if (this.fpsStats.counter === 5) {
      var scale = 0.8;
      if (this.fpsStats.up) {
        scale = 1.2;
        // オリジナルより大きくしない
        if (this.fpsStats.org.height <= size.height || this.fpsStats.org.width <= size.width) {
          return;
        }
      } else if (fps < 10) {
        scale = 0.5;
      }
      // DataChannelで解像度変更を要求
      this.crMgr.sendCameraSetRes(parseInt(size.width * scale), parseInt(size.height * scale));
    }
  }

  today() {
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let date = today.getDate();
    let hour = today.getHours();
    let minute = today.getMinutes();
    let second = today.getSeconds();
    return year + "/" + month + "/" + date + " " + hour + ":" + minute + ":" + second;
  }

  addDataChannelMessage(text) {
     // 表示する文字列の長さ
     const LEN_DATACHANNEL_MESSAGE = 5000;

     // JSON を整形して表示します。
     let message = this.today();
     message += '\n';
     message += text;
     if (this.state.dataChannelMessage) {
       message += '\n----\n';
       message += this.state.dataChannelMessage;
     }

     if (message.length > LEN_DATACHANNEL_MESSAGE) {
       message = message.substring(0, LEN_DATACHANNEL_MESSAGE);
     }
     this.setState({
       dataChannelMessage: message
     });
  }

  disconnectPS() {
    this.jumpTest.clear();
    this.touchTest.clear();

    if (this.walkTest) {
      this.walkTest.stop();
      this.walkTest = null;
    }

    // FPS集計タイマーを解除
    if (this.aggregateFPSIntervalId) {
      clearInterval(this.aggregateFPSIntervalId);
      this.aggregateFPSIntervalId = null;
    }

    if (this.crMgr) {
      // ビデオエンコーダ量子化パラメータ受信リスナー解除
      this.crMgr.clearVideoEncoderQPListener();
      this.crMgr.disconnect();
      this.crMgr = null;
    }

    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleWindowBlur);

    // マウス・タッチイベントを解除
    this.inputEventMgr.removeEventListeners();
  }

  handleWindowBlur = () => {
    if (!this.crMgr) {
      return;
    }

    // // ブラウザからフォーカスが別のウィンドウに移った場合は
    // // 動きを止めるために命令を出しておきます。
    // this.crMgr.releaseMoveBack();
    // this.crMgr.releaseMoveLeft();
    // this.crMgr.releaseMoveRight();
    // this.crMgr.releaseMoveFront();
  }

  handleKeyDown = (e) => {
    if (!this.crMgr) {
      return;
    }

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.crMgr.pressMoveBack();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.crMgr.pressMoveLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.crMgr.pressMoveRight();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.crMgr.pressMoveFront();
    } else if (e.code === 'Space') {
      this.crMgr.jump();
    }
  }

  handleKeyUp = (e) => {
    if (!this.crMgr) {
      return;
    }

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.crMgr.releaseMoveBack();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.crMgr.releaseMoveLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.crMgr.releaseMoveRight();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.crMgr.releaseMoveFront();
    } else if (e.code === 'Space') {
      this.crMgr.stopJump();
    }
  }

  handleMouseDown = (button, x, y) => {
    if (this.crMgr) {
      this.crMgr.mouseDown(button, x, y);
    }
  }

  handleMouseUp = (button, x, y) => {
    if (this.crMgr) {
      this.crMgr.mouseUp(button, x, y);
    }
  }

  handleMouseMove = (x, y, deltaX, deltaY) => {
    if (this.crMgr) {
      this.crMgr.mouseMove(x, y, deltaX, deltaY);
    }
  }

  handleMouseEnter = () => {
    if (this.crMgr) {
      this.crMgr.mouseEnter();
    }
  }

  handleMouseLeave = () => {
    if (this.crMgr) {
      this.crMgr.mouseLeave();
    }
  }

  handleTouchStart = (touches) => {
    if (this.crMgr) {
      this.crMgr.touchStart(touches);
    }
  }
  
  handleTouchMove = (touches) => {
    if (this.crMgr) {
      this.crMgr.touchMove(touches);
    }
  }

  handleTouchEnd = (touches) => {
    if (this.crMgr) {
      this.crMgr.touchEnd(touches);
    }
  }

  setMoveEventInterval = (interval) => {
    if (this.crMgr) {
      this.crMgr.setMoveEventInterval(interval);
    }
  }

  handleFullscreen() {
    toggleFullscreen();
  }

  handleVideoMuted(muted) {
    if (this.crMgr) {
      this.crMgr.setVideoMuted(muted);
    }
  }

  handleBitrateChanged(bitrate) {
    if (this.crMgr) {
      this.crMgr.setEncoderTargetBitrate(bitrate);
    }
  }

  handleOSCClick() {
    if (this.crMgr) {
      this.crMgr.sendOSC('/ps/sample', 's', this.metaCommId);
    }
  }

  handleScalingScreenMode(mode) {
    this.scalingScreenMode = mode;
    var container = document.getElementById('video-container');
    var player0 = document.getElementById('webrtc-player0');
    var player1 = document.getElementById('webrtc-player1');

    if (mode === true) {
      console.log("handleScalingScreenMode : YES");
      container.className = 'video-container-scaling';
      player0.className = 'webrtc-player-scaling';
      player1.className = 'webrtc-player-scaling';
      var flg = this.videoAspect > 1;
      if (this.aspectflip) flg = !flg;
      if (flg) {
        player0.classList.add('webrtc-player-scaling-h');
        player1.classList.add('webrtc-player-scaling-h');
      } else {
        player0.classList.add('webrtc-player-scaling-w');
        player1.classList.add('webrtc-player-scaling-w');
      }
    } else {
      console.log("handleScalingScreenMode : NO");
      container.className = 'video-container';
      player0.className = 'webrtc-player';
      player1.className = 'webrtc-player';
    }
    this.inputEventMgr.setScalingScreenMode(this.scalingScreenMode);
  }

  handleUIInteractionClick() {
    if (this.crMgr) {
      this.crMgr.sendUIInteraction({
        'type': 'message',
        'message': 'Sample Message!'
      });
    }
  }

  handleUIInteractionMessageClick(obj) {
    if (this.crMgr) {
      this.crMgr.sendUIInteraction(obj);
    }
  }

  handleJumpTestClick() {
    if (!this.crMgr) {
      return;
    }

    if (this.jumpTest.isRunning()) {
      this.jumpTest.clear();
    } else {
      this.jumpTest.start(() => {
        this.crMgr.jump();
      });
    }
  }

  handleTouchTest3Click() {
    console.log('handleTouchTest3Click: call');
    if (!this.crMgr) {
      return;
    }

    if (this.touchTest.isRunning()) {
      console.log('handleTouchTest3Click: stop');
      this.touchTest.clear();
      this.inputEventCommand.TouchEnd(this.crMgr);
    } else {
      console.log('handleTouchTest3Click: start');
      this.inputEventCommand.TouchStart(this.crMgr);
      this.touchTest.start(() => {
        this.inputEventCommand.TouchMove(this.crMgr);
      }, 50);
    }
  }

  handleRandomTestClick() {
    if (!this.crMgr) {
      return;
    }

    if (this.walkTest) {
      this.walkTest.stop();
      this.walkTest = null;
    } else {
      this.walkTest = new RandomWalk(this.crMgr);
      this.walkTest.start();
    }
  }

  handleConnectionClick() {
    if (this.crMgr) {
      this.disconnectPS();
    } else {
      this.connectPS();
    }
  }

  onLeftChanged(e) {
    if (this.crMgr) {
      this.crMgr.leftAnalog(e.x, e.y);
    }
  }

  onRightChanged(e) {
    if (this.crMgr) {
      this.crMgr.rightAnalog(e.x, e.y);
    }
  }

  handleCloseLogingDialog(metaCommId, cameraMode, sceneId, serverOptions) {
    console.log('Setting Info:');
    console.log('    metaCommId: ' + metaCommId);
    console.log('    cameraMode: ' + cameraMode);
    console.log('    sceneId: ' + sceneId);
    console.log('    serverOptions: ', serverOptions);

    this.setState({
      isLoginDialogOpen: false,
      metaCommId: metaCommId
    });

    // ユーザ情報を設定します。
    this.userInfo = {
      metaCommId: metaCommId,
      jwtToken: metaCommId,
      cameraMode: cameraMode
    }

    // サーバ情報を設定します。
    this.options = serverOptions;

    // 接続先の sceneId を設定します。
    // 三人称カメラの場合は空いている sceneId をシグナリングサーバが指定するので、
    // ここでは undefined が定義されます。
    this.sceneId = sceneId;

    // PixelStreamingへの接続を行います。
    this.connectPS();
  }

  handleLatencyTestClick() {
    if (this.crMgr) {
      let StartTimeMs = Date.now();
      this.crMgr.sendLatencyTest({
        'StartTime': StartTimeMs
      });
    }
  }

  handleQualityControlClick() {
    if (this.crMgr) {
      this.crMgr.requestQualityControl();
    }
  }

  handleRecvDataChannelVisibleClick() {
    this.setState({
      isDataChannelOpen: !this.state.isDataChannelOpen
    })
  }

  handleShownInfoClick() {
    this.setState({
      isShownInfo: !this.state.isShownInfo
    })
  }

  handleAutoScreenResChanged(autoScreenRes) {
    this.setState({
      autoScreenRes: autoScreenRes
    })
  }

  // video タグのミュート設定を切り替えます。
  setVideoMuted(muted) {
    for (let i = 0; i < 2; i++) {
      let video = document.getElementById('webrtc-player' + i);
      if (video) {
        video.muted = muted;
      }
    }
  }

  handleDataChannelMessageChange(e) {
    this.setState({
      dataChannelMessage: e.target.value
    });
  }

  handleCameraSetRes(width, height) {
    if (this.crMgr) {
      this.crMgr.sendCameraSetRes(width, height);
    }
  }

  render() {
    // TODO video-container に video タグを追加します。
    return(
      <div className="background">
        <div className='menu'>
          <Menu 
            sendDataChannel={this.handleUIInteractionMessageClick.bind(this)}
            sendCameraSetRes={this.handleCameraSetRes.bind(this)}
            onRecvDataChannelVisibleClick={this.handleRecvDataChannelVisibleClick.bind(this)}
            onShownInfo={this.handleShownInfoClick.bind(this)}
            onBitrateChanged={this.handleBitrateChanged.bind(this)}
            onFullscreenChanged={this.handleFullscreen.bind(this)}
            onVideoMuted={this.handleVideoMuted.bind(this)}
            onUIInteractionClick={this.handleUIInteractionClick.bind(this)}
            onSetMoveEventInterval={this.setMoveEventInterval.bind(this)}
            onJumpTestClick={this.handleJumpTestClick.bind(this)}
            onRandomTestClick={this.handleRandomTestClick.bind(this)}
            onOSCClick={this.handleOSCClick.bind(this)}
            onScalingScreenMode={this.handleScalingScreenMode.bind(this)}
            onConnectionClick={this.handleConnectionClick.bind(this)}
            onAutoScreenResChanged={this.handleAutoScreenResChanged.bind(this)}
            onMouseTest1Click={this.inputEventCommand.handleMouseTest1Click.bind(this)}
            onMouseTest2Click={this.inputEventCommand.handleMouseTest2Click.bind(this)}
            onTouchTest1Click={this.inputEventCommand.handleTouchTest1Click.bind(this)}
            onTouchTest2Click={this.inputEventCommand.handleTouchTest2Click.bind(this)}
            onTouchTest3Click={this.handleTouchTest3Click.bind(this)} />
        </div>
        <div className="virtual-controller-base">
          <div id="video-container">
            <video id="webrtc-player0" className='webrtc-player' muted playsInline autoPlay></video>
            <video id="webrtc-player1" className='webrtc-player' muted playsInline autoPlay></video>
          </div>
          <div className="virtual-controller-left">
            <VSitck onValueChanged={this.onLeftChanged.bind(this)} />
          </div>
          <div className="virtual-controller-right">
            <VSitck onValueChanged={this.onRightChanged.bind(this)} />
          </div>
          <div className="player-info">
            <div className="meta-comm-id">{this.state.metaCommId}</div>
            <div className="player-id">PlayerID:{this.state.playerId}</div>
            {this.state.isShownInfo && (
              <div className="player-id">FPS:{this.state.fps}, CameraRes:{this.state.cameraRes}, QP:{this.state.qp}</div>
            )}
            {this.state.isDataChannelOpen && (
              <textarea className="datachannel-message" value={this.state.dataChannelMessage} onChange={this.handleDataChannelMessageChange.bind(this)}></textarea>
            )}
          </div>
        </div>
        <LoginDialog isOpen={this.state.isLoginDialogOpen} onClose={this.handleCloseLogingDialog.bind(this)} />
        <ToastContainer />
      </div>
    );
  }
}

export default App;
