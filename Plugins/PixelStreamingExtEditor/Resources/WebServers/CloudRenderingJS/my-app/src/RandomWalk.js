
/**
 * ランダムにキャラクターを操作するためのクラス。
 */
class RandomWalk {
  constructor(crMgr) {
    this.crMgr = crMgr;
    this.timer = null;
  }

  randomValue() {
    return 1.0 - Math.random() * 2.0;
  }

  type() {
    return Math.ceil(Math.random() * 5);
  }

  interval() {
    return 1000 + Math.ceil(Math.random() * 1000);
  }

  action() {
    switch (this.type()) {
      default:
        this.move();
        break;
      case 1:
        this.jump();
        this.stopJump();
        break;
    }

    this.next();
  }

  move() {
    let x = this.randomValue();
    let y = this.randomValue();
    this.crMgr.leftAnalog(x, y);
  }

  jump() {
    this.crMgr.jump();
  }

  stopJump() {
    this.crMgr.stopJump();
  }

  next() {
    this.timer = setTimeout(() => {
      this.action();
    }, this.interval());
  }

  start() {
    this.stop();
    this.action();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export default RandomWalk;
