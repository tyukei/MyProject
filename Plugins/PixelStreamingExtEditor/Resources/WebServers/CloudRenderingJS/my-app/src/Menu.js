import React from 'react';
import './Menu.css';

class Menu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      isFullscreen: false,
      bitrate: 20000000,
      sendInterval: 0,
      isJumpTest: false,
      isRandomTest: false,
      isConnected: true,
      muted: false,
      scalingScreenMode: true,
      isDebug: false,
      autoScreenRes: false,
      followCamera: false,
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  handleOutsideClick(e) {
    if (this.dropdownRef.current && !this.dropdownRef.current.contains(e.target)) {
      this.setState(() => ({
        isOpen: false
      }));
    }
  }

  handleMenuClick() {
    this.setState(prevState => ({
      isOpen: !prevState.isOpen
    }));
  }

  handleFullscreen() {
    this.setState(prevState => ({
      isFullscreen: !prevState.isFullscreen
    }));

    if (this.props.onFullscreenChanged) {
      this.props.onFullscreenChanged(this.state.isFullscreen);
    }
  }

  handleVideoMuted() {
    this.setState(prevState => ({
      muted: !prevState.muted
    }));

    if (this.props.onVideoMuted) {
      this.props.onVideoMuted(!this.state.muted);
    }
  }

  handleBitrateClick() {
    if (this.props.onBitrateChanged) {
      this.props.onBitrateChanged(this.state.bitrate);
    }
  }

  handleUIIteractionClick() {
    if (this.props.onUIInteractionClick) {
      this.props.onUIInteractionClick();
    }
  }

  handleOSCClick() {
    if (this.props.onOSCClick) {
      this.props.onOSCClick();
    }
  }

  handleScalingScreenMode() {
    this.setState(prevState => ({
      scalingScreenMode: !prevState.scalingScreenMode
    }));

    if (this.props.onScalingScreenMode) {
      this.props.onScalingScreenMode(!this.state.scalingScreenMode);
    }
  }

  handleShownInfoClick() {
    this.setState(prevState => ({
      isShownInfo: !prevState.isShownInfo
    }));

    if (this.props.onShownInfo) {
      this.props.onShownInfo(!this.state.isShownInfo);
    }
  }

  handleJumpTestClick() {
    if (this.props.onJumpTestClick) {
      this.props.onJumpTestClick();
      this.setState(prevState => ({
        isJumpTest: !prevState.isJumpTest
      }));  
    }
  }

  handleRandomTestClick() {
    if (this.props.onRandomTestClick) {
      this.props.onRandomTestClick();
      this.setState(prevState => ({
        isRandomTest: !prevState.isRandomTest
      }));  
    }
  }

  handleStop = (e) => {
    e.stopPropagation();
    return false;
  }

  handleConnectionClick = () => {
    this.setState(prevState => ({
      isConnected: !prevState.isConnected
    }));

    if (this.props.onConnectionClick) {
      this.props.onConnectionClick();
    }
  }

  handleMouseTest1Click() {
    if (this.props.onMouseTest1Click) {
      this.props.onMouseTest1Click();
    }
  }

  handleMouseTest2Click() {
    if (this.props.onMouseTest2Click) {
      this.props.onMouseTest2Click();
    }
  }

  handleTouchTest1Click() {
    if (this.props.onTouchTest1Click) {
      this.props.onTouchTest1Click();
    }
  }

  handleTouchTest2Click() {
    if (this.props.onTouchTest2Click) {
      this.props.onTouchTest2Click();
    }
  }

  handleTouchTest3Click() {
    if (this.props.onTouchTest3Click) {
      this.props.onTouchTest3Click();
    }
  }

  handleRecvDataChannelVisibleClick() {
    if (this.props.onRecvDataChannelVisibleClick) {
      this.props.onRecvDataChannelVisibleClick();
    }
  }

  sendDataChannel() {
    console.log('call sendDataChannel.');
    if (this.props.sendDataChannel) {
      try {
        const obj = JSON.parse(this.sendDataChannelDescriptor.value);
        console.log(obj);
        this.props.sendDataChannel(obj);
      } catch (e) {
        console.log('JSON format is invalid.', this.sendDataChannelDescriptor.value);
      }
    }
  }

  setMoveEventInterval() {
    console.log('call setMoveEventInterval.');
    if (this.props.onSetMoveEventInterval) {
      this.props.onSetMoveEventInterval(this.state.sendInterval);
    }
  }

  sendYesNoDialogYes() {
    if (this.props.sendDataChannel) {
      const obj = {
        "EventID": "CLOSED_UI_YES_NO_DIALOG",
        "YesNoDialogID": this.yesNoDialogID.value,
        "Result": true
      };
      this.props.sendDataChannel(obj);
    }
  }

  sendYesNoDialogNo() {
    if (this.props.sendDataChannel) {
      const obj = {
        "EventID": "CLOSED_UI_YES_NO_DIALOG",
        "YesNoDialogID": this.yesNoDialogID.value,
        "Result": false
      };
      this.props.sendDataChannel(obj);
    }
  }

  sendFollowCamera() {
    this.setState(prevState => ({
      followCamera: !prevState.followCamera
    }));
    if (this.props.sendDataChannel) {
      const obj = {
        "type": "FollowCamera",
        "value": !this.state.followCamera
      };
      this.props.sendDataChannel(obj);
    }
  }

  sendCameraRes() {
    if (this.props.sendCameraSetRes) {
      this.props.sendCameraSetRes(this.cameraWidth.value, this.cameraHeight.value);
    }
  }

  handleAutoScreenResClick() {
    this.setState(prevState => ({
      autoScreenRes: !prevState.autoScreenRes
    }));
    if (this.props.onAutoScreenResChanged) {
      this.props.onAutoScreenResChanged(!this.state.autoScreenRes);
    }
  }

  setBitrate(value) {
    this.setState(() => ({
      bitrate: value
    }));
  }

  setSendInterval(value) {
    this.setState(() => ({
      sendInterval: value
    }));
  }

  render() {
    return(
      <>
        <div 
          className="menu-root"
          ref={(dropdownRef) => { this.dropdownRef = dropdownRef; }}
          onMouseDown={this.handleStop.bind(this)}
          onTouchStart={this.handleStop.bind(this)}>
          <span>
            <button onClick={this.handleMenuClick.bind(this)} aria-haspopup="true" aria-expanded={this.state.isOpen}>
              MENU
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4B5563">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>

          {this.state.isOpen && (
            <div className="menu-base">
              <div className="menu-item">
                <div className="menu-title">
                  フルスクリーン
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleFullscreen.bind(this)}>
                    {this.state.isFullscreen ? ' Exit' : ' Full'}
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                  ミュート設定
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleVideoMuted.bind(this)}>
                    {this.state.muted ? ' ON' : ' OFF'}
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                  自動カメラ回転
                </div>
                <div>
                  <button className="menu-btn" onClick={this.sendFollowCamera.bind(this)}>
                    {this.state.followCamera ? ' OFF' : ' ON'}
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                  スケーリングスクリーンモード
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleScalingScreenMode.bind(this)}>
                    {this.state.scalingScreenMode ? ' OFF' : ' ON'}
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                FPS, 解像度, QP表示
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleShownInfoClick.bind(this)}>
                    {this.state.isShownInfo ? ' OFF' : ' ON'}
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                  解像度
                </div>
                <div className='menu-flex'>
                  <span className='input-title'>Width</span>
                  <input type='text' className='menu-text' ref={ i => { this.cameraWidth = i }}></input>
                </div>
                <div className='menu-flex'>
                  <span className='input-title'>Height</span>
                  <input type='text' className='menu-text' ref={ i => { this.cameraHeight = i }}></input>
                </div>
                <div>
                  <button className="menu-btn" onClick={this.sendCameraRes.bind(this)}>
                    送信
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                解像度自動調節
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleAutoScreenResClick.bind(this)}>
                    {this.state.autoScreenRes ? ' OFF' : ' ON'}
                  </button>
                </div>
              </div>

              <div className='menu-item'>
                <div className="menu-title" >
                  Yes/Noダイアログ
                </div>
                <div className='menu-flex'>
                  <span className='input-title'>YesNoDialogID</span>
                  <input type='text' className='menu-text' ref={ i => { this.yesNoDialogID = i }}></input>
                </div>
                <div className='menu-flex'>
                  <button className="menu-btn" onClick={this.sendYesNoDialogYes.bind(this)}>はい</button>
                  <button className="menu-btn" onClick={this.sendYesNoDialogNo.bind(this)}>いいえ</button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                送信データチャンネル
                <a href=' ' target='blank' className="menu-datachannel-btn">IF詳細</a>
                </div>
                <div>
                  <textarea className='menu-descriptor' placeholder="JSON を入力してください" rows="6" ref={ i => { this.sendDataChannelDescriptor = i }}></textarea>
                  <button className="menu-btn" onClick={this.sendDataChannel.bind(this)}>
                    送信
                  </button>
                </div>
              </div>

              <div className="menu-item">
                <div className="menu-title">
                受信データチャンネル
                </div>
                <div>
                  <button className="menu-btn" onClick={this.handleRecvDataChannelVisibleClick.bind(this)}>
                    表示/非表示
                  </button>
                </div>
              </div>

              {this.state.isDebug && (
              <div>
                <div className="menu-item">
                  <div className="menu-title">
                  Move 系イベント間引き送信間隔(mSec)
                  </div>
                  <div>
                    <input type="number" value={this.state.sendInterval} onChange={(event) => {this.setSendInterval(event.target.value)}} />
                    <button className="menu-btn" onClick={this.setMoveEventInterval.bind(this)}>
                      設定
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                    WebRTC ビットレート
                  </div>
                  <div>
                    <input type="number" value={this.state.bitrate} onChange={(event) => {this.setBitrate(event.target.value)}} />
                    <button className="menu-btn2" onClick={this.handleBitrateClick.bind(this)}>
                      送信
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                    UIInteraction テスト
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleUIIteractionClick.bind(this)}>
                      テスト送信
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                    OSC テスト
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleOSCClick.bind(this)}>
                      テスト送信
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                    ジャンプテスト
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleJumpTestClick.bind(this)}>
                      {this.state.isJumpTest ? '停止' : '開始'}
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                    ランダムテスト
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleRandomTestClick.bind(this)}>
                      {this.state.isRandomTest ? '停止' : '開始'}
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  接続テスト
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleConnectionClick.bind(this)}>
                      {this.state.isConnected ? '切断' : '接続'} 
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  マウステスト１
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleMouseTest1Click.bind(this)}>
                      テスト実行
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  マウステスト２
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleMouseTest2Click.bind(this)}>
                      テスト実行
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  タッチテスト１
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleTouchTest1Click.bind(this)}>
                      テスト実行
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  タッチテスト２
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleTouchTest2Click.bind(this)}>
                      テスト実行
                    </button>
                  </div>
                </div>
                <div className="menu-item">
                  <div className="menu-title" >
                  タッチテスト３
                  </div>
                  <div>
                    <button className="menu-btn" onClick={this.handleTouchTest3Click.bind(this)}>
                      テスト実行
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </>
    )
  }
}

export default Menu;
