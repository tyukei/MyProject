import React from 'react';
import './VStick.css';
import vstickBase from './assets/vstick-base.png'
import vstick from './assets/vstick.png'

class StickRepeat {
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
      if (this.timer && this.cnt > 4) {
        this.clear();
        return;
      }
      func();
    }, 66);
    func();
  }
}

/**
 * バーチャルスティックコンポーネント。
 */
class VSitck extends React.Component {
  constructor(props) {
    super(props);

    // 画像のサイズによって、初期値を変更すること。

    this.state = {
      imageX: 32,
      imageY: 32,
      imageRadius: 32,
      centerX: 0,
      centerY: 0,
      maxDistance: 0,
      isDrag: false,
    };

    document.addEventListener("mousemove", this.handleMove);
    document.addEventListener("mouseup", this.handleUp);
    document.addEventListener("touchmove", this.handleTouchMove);
    document.addEventListener("touchend", this.handleTouchEnd);
    document.addEventListener("touchcancel", this.handleTouchEnd);

    this.targetId = Math.random().toString(32).substring(2);
    this.stickRepeat = new StickRepeat();
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    this.stickRepeat.clear();

    document.removeEventListener("mousemove", this.handleMove);
    document.removeEventListener("mouseup", this.handleUp);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("touchcancel", this.handleTouchEnd);
  }

  /**
   * VStick の this.targetId と同じ id を持つタッチイベントを取得します。
   * 
   * 同じ id が見つからない場合は、null を返却します。
   * 
   * @param {Array} タッチイベントの配列
   * @returns タッチイベント
   */
  findTouchEvent(touches) {
    for (let touch of touches) {
      if (touch.target.id === this.targetId) {
        return touch;
      }
    }
    return null;
  }

  /**
   * バーチャルスティックの値を通知します。
   * 
   * @private
   * @param {Number} x x座標
   * @param {Number} y y座標
   */
  postStickEvent(x, y) {
    if (this.props.onValueChanged) {
      this.props.onValueChanged({ x: x, y: y });
    }
  }

  /**
   * ドラッグの開始処理を行います。
   * 
   * @private
   * @param {Number} dragX ドラッグ開始x座標
   * @param {Number} dragY ドラッグ開始y座標
   */
  dragStart = (dragX, dragY) => {
    this.stickRepeat.clear();
    this.setState({
      x: dragX, 
      y: dragY,
      isDrag: true
    });
  }

  /**
   * ドラッグの移動処理を行います。
   * 
   * @private
   * @param {Number} dragX 移動先のx座標
   * @param {Number} dragY 移動先のy座標
   */
  dragMove = (dragX, dragY) => {
    const { centerX } = this.state;
    const { centerY } = this.state;
    const { imageRadius } = this.state;
    const { maxDistance } = this.state;

    let imageX = dragX - this.baseDiv.getBoundingClientRect().left;
    let imageY = dragY - this.baseDiv.getBoundingClientRect().top;

    let dx = imageX - centerX;
    let dy = imageY - centerY;

    let distance = Math.sqrt(dx * dx + dy * dy);

    if (maxDistance < distance) {
      distance = maxDistance;
    }

    let radian = Math.atan2(dy, dx);

    let xx = distance * Math.cos(radian);
    let yy = distance * Math.sin(radian);

    let vstickX = xx / maxDistance;
    let vstickY = yy / maxDistance;
    this.postStickEvent(vstickX, -vstickY);

    this.setState({
      imageX: centerX + xx - imageRadius,
      imageY: centerY + yy - imageRadius
    });
  }

  /**
   * ドラッグ終了処理を行います。
   * 
   * @private
   */
  dragEnd = () => {
    const { centerX } = this.state;
    const { centerY } = this.state;
    const { imageRadius } = this.state;

    this.setState({
      imageX: centerX - imageRadius,
      imageY: centerY - imageRadius,
      isDrag: false
    })

    this.postStickEvent(0, 0);

    // TODO: ドラッグ終了時にスティックの情報を複数出す必要があるかもしれない。
    // その場合には、ここで、setInterval などを使って、定期的にイベントを発行する
    this.stickRepeat.start(() => {
      this.postStickEvent(0, 0);
    });
  }

  //// Touch Event

  handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const touch = this.findTouchEvent(e.touches);
    if (touch) {
      const x = touch.clientX;
      const y = touch.clientY;
      this.dragStart(x, y);
    }

    return false;
  }

  handleTouchMove = (e) => {
    if (this.state.isDrag) {
      e.preventDefault();

      let touch = this.findTouchEvent(e.touches);
      if (touch) {
        this.dragMove(touch.pageX, touch.pageY);
      }
    }
  }

  handleTouchEnd = (e) => {
    if (this.state.isDrag) {
      // タッチイベントが見つからない場合は離されているので
      // ドラッグ終了処理を行う。
      let touch = this.findTouchEvent(e.touches);
      if (!touch) {
        this.dragEnd();
      }
    }
  }

  //// Mouse Event

  handleDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    const y = e.clientY;
    this.dragStart(x, y);

    return false;
  }

  handleMove = (e) => {
    if (this.state.isDrag) {
      e.preventDefault();

      this.dragMove(e.pageX, e.pageY);
    }
  }

  handleUp = () => {
    if (this.state.isDrag) {
      this.dragEnd();
    }
  }

  handleStop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  /**
   * 画像の読み込み完了イベントの処理を行います。
   * ここで、画像のサイズや描画位置などを計算しておきます。
   * 
   * componetDidMount イベントで、処理を行うと、画像のサイズが取得できない場合があったので、
   * こちらで処理を行うようにしています。
   * 
   * @private
   */
  onImgLoad() {
    const centerX = this.baseDiv.clientWidth / 2;
    const centerY = this.baseDiv.clientHeight / 2;
    const imageRadius = this.vstickImg.clientWidth / 2;
    const maxDistance = (this.baseDiv.clientWidth - this.vstickImg.clientWidth);

    let divCenterX = this.baseDiv.getBoundingClientRect().left
      + this.baseDiv.getBoundingClientRect().width / 2;
    let divCenterY = this.baseDiv.getBoundingClientRect().top
      + this.baseDiv.getBoundingClientRect().height / 2;

    this.setState({
      imageX: Math.round(centerX - imageRadius),
      imageY: Math.round(centerY - imageRadius),
      imageRadius: Math.round(imageRadius),
      centerX: Math.round(centerX),
      centerY: Math.round(centerY),
      divX: Math.round(divCenterX), 
      divY: Math.round(divCenterY),
      maxDistance: Math.round(maxDistance),
      isDrag: false
    })
  }

  render() {
    const { imageX } = this.state;
    const { imageY } = this.state;

    return (
      <>
        <div className="vstick"
            ref={(baseDiv) => { this.baseDiv = baseDiv; }}>
          <img src={vstickBase} 
              className="vstick-base-img" 
              onMouseDown={this.handleStop.bind(this)}
              onTouchStart={this.handleStop.bind(this)}
              alt="vstick-base" />
          <img src={vstick} 
              style={{left:imageX, top:imageY}}
              className="vstick-img"
              id={this.targetId}
              ref={(vstickImg) => { this.vstickImg = vstickImg; }}
              onLoad={this.onImgLoad.bind(this)}
              onMouseDown={this.handleDown.bind(this)}
              onTouchStart={this.handleTouchStart.bind(this)}
              alt="vstick" />
        </div>
      </>
    );
  }
}

export default VSitck;
