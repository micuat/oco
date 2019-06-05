try {
  var Gpio = require('pigpio').Gpio;
} catch (er) {
  Gpio = null;
  console.log('skipping GPIO');
}

if(Gpio) {
  const button = new Gpio(6, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
  });
  button.on('interrupt', (level) => {
    bm.interrupt(level);
  });
}

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

process.stdin.setRawMode = true;
process.stdin.resume();
process.stdin.on('data', (data) => {
  const byteArray = [...data]
  if (byteArray.length > 0 && byteArray[0] === 48) {
    bm.interrupt('0');
  }
  if (byteArray.length > 0 && byteArray[0] === 49) {
    bm.interrupt('1');
  }
});
