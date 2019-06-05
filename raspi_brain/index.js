const Gpio = require('pigpio').Gpio;

const button = new Gpio(6, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.EITHER_EDGE
});


class BumperManager {
  constructor () {
    this.isOnWall = false;
    this.lastTime = this.getMillis();
    this.hitThreshold = 100;
  }

  getMillis () {
    return Date.now();
  }

  interrupt (level) {
    const t = this.getMillis();
    if(level == '1' && this.isOnWall == false) {
      if(t - this.lastTime < this.hitThreshold) {
        console.log('misdetection');
      }
      else {
        console.log('hit');
        this.isOnWall = true;
        this.lastTime = t;
      }
    }
    else if(level == '0' && this.isOnWall == true) {
      console.log('released');
      this.isOnWall = false;
    }
  }
}

const bm = new BumperManager();

button.on('interrupt', (level) => {
  bm.interrupt(level);
});
