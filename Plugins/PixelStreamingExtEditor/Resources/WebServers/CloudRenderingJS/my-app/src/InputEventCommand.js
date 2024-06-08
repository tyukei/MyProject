
class InputEventTest {
  // onMouseTest1Click={this.inputEventCommand.handleMouseTest1Click.bind(this)}
  // App.js で上記のように bind(this) で関数を呼び出しているので App.js が this ポインタに渡されてきます。
  // this.crMgr は、App.js の this.crMgr になりますので、注意してください。
  handleMouseTest1Click() {
    if (this.crMgr) {
      this.crMgr.mouseDown(0, 0, 0);
      this.crMgr.mouseUp(0, 0, 0);
      this.crMgr.mouseDown(0, 0, 65535);
      this.crMgr.mouseUp(0, 0, 65535);
      this.crMgr.mouseDown(0, 65535, 0);
      this.crMgr.mouseUp(0, 65535, 0);
      this.crMgr.mouseDown(0, 65535, 65535);
      this.crMgr.mouseUp(0, 65535, 65535);
    }
  }

  handleMouseTest2Click() {
    if (this.crMgr) {
      this.crMgr.mouseMove(26214, 26214, 8192, 8192);
      this.crMgr.mouseMove(39321, 39321, 8192, 8192);
      this.crMgr.mouseMove(52428, 52428, 8192, 8192);
      this.crMgr.mouseMove(65535, 65535, 8192, 8192);
      this.crMgr.mouseMove(52428, 52428, -8192, -8192);
      this.crMgr.mouseMove(39321, 39321, -8192, -8192);
      this.crMgr.mouseMove(26214, 26214, -8192, -8192);
      this.crMgr.mouseMove(0, 0, -8192, -8192);
    }
  }

  handleTouchTest1Click() {
    if (this.crMgr) {
      let touches = [];
      touches.push({
        x: 0,
        y: 0,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchEnd(touches);

      touches = [];
      touches.push({
        x: 0,
        y: 65535,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchEnd(touches);

      touches = [];
      touches.push({
        x: 65535,
        y: 0,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchEnd(touches);

      touches = [];
      touches.push({
        x: 65535,
        y: 65535,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchEnd(touches);

      touches = [];
      touches.push({
        x: 0,
        y: 0,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 0,
        y: 65535,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 0,
        y: 65535,
        fingerId: 2,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 65535,
        y: 65535,
        fingerId: 3,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchEnd(touches);
    }
  }

  handleTouchTest2Click() {
    if (this.crMgr) {
      let touches = [];
      touches.push({
        x: 26214,
        y: 26214,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 39321,
        y: 39321,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 52428,
        y: 52428,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 65535,
        y: 65535,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 26214,
        y: 26214,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 13107,
        y: 13107,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      this.crMgr.touchStart(touches);
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 39321,
        y: 39321,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 26214,
        y: 26214,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 52428,
        y: 52428,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 39321,
        y: 39321,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);

      touches = [];
      touches.push({
        x: 65535,
        y: 65535,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 52428,
        y: 52428,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      this.crMgr.touchMove(touches);
      this.crMgr.touchEnd(touches);
    }
  }

  TouchStart(manager) {
    if (manager) {
      console.log('TouchStart: call');
      let touches = [];
      touches.push({
        x: 25000,
        y: 25000,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25100,
        y: 25100,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25200,
        y: 25200,
        fingerId: 2,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25300,
        y: 25300,
        fingerId: 3,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25400,
        y: 25400,
        fingerId: 4,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25500,
        y: 25500,
        fingerId: 5,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25600,
        y: 25600,
        fingerId: 6,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25700,
        y: 25700,
        fingerId: 7,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25800,
        y: 25800,
        fingerId: 8,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25900,
        y: 25900,
        fingerId: 9,
        force: 0,
        valid: 1
      });
      manager.touchStart(touches);
    }
  }

  TouchMove(manager) {
    if (manager) {
      let touches = [];
      console.log('TouchMove: call');
      touches.push({
        x: 25000,
        y: 25000,
        fingerId: 0,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25100,
        y: 25100,
        fingerId: 1,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25200,
        y: 25200,
        fingerId: 2,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25300,
        y: 25300,
        fingerId: 3,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25400,
        y: 25400,
        fingerId: 4,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25500,
        y: 25500,
        fingerId: 5,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25600,
        y: 25600,
        fingerId: 6,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25700,
        y: 25700,
        fingerId: 7,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25800,
        y: 25800,
        fingerId: 8,
        force: 128,
        valid: 1
      });
      touches.push({
        x: 25900,
        y: 25900,
        fingerId: 9,
        force: 128,
        valid: 1
      });
      manager.touchMove(touches);
      manager.touchMove(touches);
      manager.touchMove(touches);
    }
  }

  TouchEnd(manager) {
    if (manager) {
      console.log('TouchEnd: call');
      let touches = [];
      touches.push({
        x: 25000,
        y: 25000,
        fingerId: 0,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25100,
        y: 25100,
        fingerId: 1,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25200,
        y: 25200,
        fingerId: 2,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25300,
        y: 25300,
        fingerId: 3,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25400,
        y: 25400,
        fingerId: 4,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25500,
        y: 25500,
        fingerId: 5,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25600,
        y: 25600,
        fingerId: 6,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25700,
        y: 25700,
        fingerId: 7,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25800,
        y: 25800,
        fingerId: 8,
        force: 0,
        valid: 1
      });
      touches.push({
        x: 25900,
        y: 25900,
        fingerId: 9,
        force: 0,
        valid: 1
      });
      manager.touchEnd(touches);
    }
  }
};

export default InputEventTest;
