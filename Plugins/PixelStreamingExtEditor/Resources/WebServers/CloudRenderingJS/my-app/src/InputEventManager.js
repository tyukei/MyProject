class InputEvent {
  constructor() {
    this.DragFlag = false;
    this.fingers = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    this.fingerIds = new Map();
    this.scalingScreenMode = true;
  }

  setScalingScreenMode(mode) {
    console.log("setScalingScreenMode() : %s", mode === true ?  'true': 'false');
    this.scalingScreenMode = mode;
  }

  onMouseDown(button, x, y) {}
  onMouseMove(x, y, deltaX, deltaY) {}
  onMouseUp(button, x, y) {}
  onMouseEnter() {}
  onMouseLeave() {}

  onTouchStart(touches) {}
  onTouchMove(touches) {}
  onTouchEnd(touches) {}

  addEventListeners() {
    if (typeof(window.ontouchstart) === "undefined") {
      // pc
      document.addEventListener('mousedown', this.handleMouseDown, false);
      document.addEventListener('mouseup', this.handleMouseUp, false);
      document.addEventListener('mousemove', this.handleMouseMove, false);
      document.addEventListener('mouseenter', this.handleMouseEnter, false);
      document.addEventListener('mouseleave', this.handleMouseLeave, false);
    } else{
      // smartphone
      document.addEventListener('touchstart', this.handleTouchStart, false);
      document.addEventListener('touchend', this.handleTouchEnd, false);
      document.addEventListener('touchcancel', this.handleTouchEnd, false);
      document.addEventListener('touchmove', this.handleTouchMove, false);
    }
  }

  removeEventListeners() {
    if (typeof(window.ontouchstart) === "undefined") {
      document.removeEventListener('mousedown', this.handleMouseDown);
      document.removeEventListener('mouseup', this.handleMouseUp);
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseenter', this.handleMouseEnter);
      document.removeEventListener('mouseleave', this.handleMouseLeave);
    } else {
      document.removeEventListener('touchstart', this.handleTouchStart);
      document.removeEventListener('touchend', this.handleTouchEnd);
      document.removeEventListener('touchcancel', this.handleTouchEnd);
      document.removeEventListener('touchmove', this.handleTouchMove);
    }

    this.DragFlag = false;
    this.fingers = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    this.fingerIds = new Map();
  }

  handleMouseDown = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    let coord = this.normalizeAndQuantizeUnsigned(event.offsetX, event.offsetY);
    if (coord && coord.inRange) {
      this.onMouseDown(event.button, coord.x, coord.y);
      this.DragFlag = true;
    }
  }

  handleMouseUp = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    let coord = this.normalizeAndQuantizeUnsigned(event.offsetX, event.offsetY);
    if (coord && coord.inRange) {
      this.onMouseUp(event.button, coord.x, coord.y);
    }
    this.DragFlag = false;
  }

  handleMouseMove = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    if (this.DragFlag) {
      let coord = this.normalizeAndQuantizeUnsigned(event.offsetX, event.offsetY);
      let delta = this.normalizeAndQuantizeSigned(event.movementX, event.movementY);
      if (coord && delta) {
        this.onMouseMove(coord.x, coord.y, delta.x, delta.y);
      }
    }
  }

  handleMouseEnter = () => {
    this.onMouseEnter();
  }

  handleMouseLeave = () => {
    this.DragFlag = false;
    this.onMouseLeave();
  }

  rememberTouch = (touch) => {
    const finger = this.fingers.pop();
    if (finger === undefined) {
      console.log("exhausted touch identifiers");
      return;
    }
    this.fingerIds.set(touch.identifier, finger);
  }

  forgetTouch = (touch) => {
    this.fingers.push(this.fingerIds.get(touch.identifier));
    // Sort array back into descending order. This means if finger '1' were to lift after finger '0', we would ensure that 0 will be the first index to pop
    this.fingers.sort(function (a, b) {
      return b - a;
    });
    this.fingerIds.delete(touch.identifier);
  }

  handleTouchStart = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    let touches = [];
    for (let i = 0; i < event.changedTouches.length; i++) {
      let touch = event.changedTouches[i];
      this.rememberTouch(touch);
      let fingerId = this.fingerIds.get(touch.identifier);
      if (fingerId !== undefined) {
        let x = 0;
        let y = 0;
        if (this.scalingScreenMode === true) {
          let targetRect = event.target.getBoundingClientRect();
          x = touch.clientX - targetRect.left;
          y = touch.clientY - targetRect.top;
        } else {
          x = touch.clientX;
          y = touch.clientY;
        }
        let coord = this.normalizeAndQuantizeUnsigned(x, y);
        if (coord) {
          touches.push({
            x: coord.x,
            y: coord.y,
            fingerId: fingerId,
            force: 255 * touch.force,
            valid: coord.inRange ? 1 : 0
          });
        }
      }
    }

    this.onTouchStart(touches);
  }

  handleTouchEnd = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    let touches = [];
    for (let i = 0; i < event.changedTouches.length; i++) {
      let touch = event.changedTouches[i];
      let fingerId = this.fingerIds.get(touch.identifier);
      if (fingerId !== undefined) {
        let x = 0;
        let y = 0;
        if (this.scalingScreenMode === true) {
          let targetRect = event.target.getBoundingClientRect();
          x = touch.clientX - targetRect.left;
          y = touch.clientY - targetRect.top;
        } else {
          x = touch.clientX;
          y = touch.clientY;
        }
        let coord = this.normalizeAndQuantizeUnsigned(x, y);
        if (coord) {
          touches.push({
            x: coord.x,
            y: coord.y,
            fingerId: fingerId,
            force: 255 * touch.force,
            valid: coord.inRange ? 1 : 0
          });
        }
        // Re-cycle unique identifiers previously assigned to each touch.
        this.forgetTouch(touch);
      }
    }
    this.onTouchEnd(touches);
  }

  handleTouchMove = (event) => {
    if (event.target?.tagName.toLowerCase() !== 'video') {
      return; // videoタグ以外のイベントは無視する
    }

    let touches = [];
    for (let i = 0; i < event.changedTouches.length; i++) {
      let touch = event.changedTouches[i];
      let fingerId = this.fingerIds.get(touch.identifier);
      if (fingerId !== undefined) {
        let x = 0;
        let y = 0;
        if (this.scalingScreenMode === true) {
          let targetRect = event.target.getBoundingClientRect();
          x = touch.clientX - targetRect.left;
          y = touch.clientY - targetRect.top;
        } else {
          x = touch.clientX;
          y = touch.clientY;
        }
        let coord = this.normalizeAndQuantizeUnsigned(x, y);
        if (coord) {
          touches.push({
            x: coord.x,
            y: coord.y,
            fingerId: fingerId,
            force: 255 * touch.force,
            valid: coord.inRange ? 1 : 0
          });
        }
      }
    }
    this.onTouchMove(touches);
  }

  /**
   * 映像表示中エレメントの取得
   * @returns 
   */
  getUsedVideoElement() {
    for (let i = 0; i < 2; i++) {
      let video = document.getElementById('webrtc-player' + i);
      if (video && video.style.display === 'inline-block') {
        return video
      }
    }
    return null;
  }

  /**
   * 映像表示サイズの取得
   * @returns 映像表示サイズ
   */
  getVideoSize() {
    const video = this.getUsedVideoElement();
    if (!video) {
      console.log("getVideoSize() : video is not ready.");
      return null;
    }

    //const bb = video.parentElement.getBoundingClientRect();

    //console.info('##### videoElement',
    //  [video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight]);
    //console.info('##### bbClientRect', bb);

    // 元の映像のサイズ
    const orgW = video.videoWidth;
    const orgH = video.videoHeight;
    const orgR = orgH / orgW; // will be 720/1280 = 9/16
    //console.info('##### orgW, orgH, orgR', [orgW, orgH, orgR]);

    // video のサイズ
    const screenW = video.clientWidth;
    const screenH = video.clientHeight;
    const screenR = screenH / screenW;
    //console.info('##### screenW, screenH, screenR',
    //  [screenW, screenH, screenR]);

    // 映像の表示領域を計算
    let videoX = 0;
    let videoY = 0;
    let videoW = 0;
    let videoH = 0;
    if ((this.scalingScreenMode === true && (orgR < screenR)) ||
        (this.scalingScreenMode === false && (orgR > screenR))) {
      //console.info('##### orgR %s screenR', this.scalingScreenMode === true ? '<': '>');
      videoH = video.clientHeight;
      videoW = Math.floor(videoH / orgR);
      videoX = Math.floor((screenW - videoW) / 2);
    } else {
      //console.info('##### orgR %s screenR', this.scalingScreenMode === true ? '>': '<');
      videoW = video.clientWidth;
      videoH = Math.floor(videoW * orgR);
      videoY = Math.floor((screenH - videoH) / 2);
    }

    return {x: videoX, y: videoY, width: videoW, height: videoH};
  }

  normalizeAndQuantizeUnsigned(x, y) {
    const playerElement = this.getVideoSize();
    if (playerElement) {
      //console.info('##### video size', playerElement);
      //console.info('##### event x,y', [x, y]);

      let normalizedX = 0;
      let normalizedY = 0;
      if (this.scalingScreenMode === true) {
        normalizedX = x / playerElement.width;
        normalizedY = y / playerElement.height;
      } else {
        normalizedX = (x - playerElement.x) / playerElement.width;
        normalizedY = (y - playerElement.y) / playerElement.height;
      }

      //console.info(`##### normalizedX,Y = ${normalizedX}, ${normalizedY}`);

      if (normalizedX < 0.0 || normalizedX > 1.0 || normalizedY < 0.0 || normalizedY > 1.0) {
        return {
          inRange: false,
          x: 65535,
          y: 65535
        };
      } else {
        return {
          inRange: true,
          x: normalizedX * 65536,
          y: normalizedY * 65536
        };
      }
    } else {
      return null;
    }
  }

  normalizeAndQuantizeSigned(x, y) {
    const playerElement = this.getVideoSize();
    if (playerElement) {
      const normalizedX = x / (0.5 * playerElement.width);
      const normalizedY = y / (0.5 * playerElement.height);
      return {
          x: normalizedX * 32767,
          y: normalizedY * 32767
      };
    } else {
      return null;
    }
  }
};

export default InputEvent;
