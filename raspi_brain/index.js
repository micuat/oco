const fs = require("fs");
const loadJson = (f) => {
  return JSON.parse(fs.readFileSync(f));
}

const settings = loadJson("settings.json");
const points = loadJson("points.json");

const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:8080');

const express = require('express');
const app = express();
const http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/', express.static('static'));
http.listen(settings.httpPort, () => {
  console.log('listening on *:' + settings.httpPort);
});

try {
  var Gpio = require('pigpio').Gpio;
} catch (er) {
  Gpio = null;
  console.log('skipping GPIO');
}

if (Gpio) {
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
  constructor() {
    this.isOnWall = false;
    this.lastTime = this.getMillis();
    this.hitThreshold = 100;
  }

  getMillis() {
    return Date.now();
  }

  interrupt(level) {
    const t = this.getMillis();
    if (level == '1' && this.isOnWall == false) {
      if (t - this.lastTime < this.hitThreshold) {
        console.log('misdetection');
        io.emit('bumper', { status: 'misdetection' });
      }
      else {
        console.log('hit');
        io.emit('bumper', { status: 'hit' });
        this.isOnWall = true;
        this.lastTime = t;
        cq.driveTillHitFlag = false;
      }
    }
    else if (level == '0' && this.isOnWall == true) {
      console.log('released');
      io.emit('bumper', { status: 'released' });
      this.isOnWall = false;
    }
  }
}

const bm = new BumperManager();

class CommandQueue {
  constructor() {
    this.queue = [];
    this.isWaitingForReply = false;
    this.driveTillHitFlag = false;
    this.driveSteps = 1000;
    this.handler = setInterval(() => {
      this.next();
    }, 10);
    this.scale = 10;
  }
  moveCommand(x, y, z) {
    return "moveToA " + x + " " + y + " " + z + " 200";
  }
  add(m) {
    this.queue.push(m);
  }
  addMove(x, y, z) {
    this.add("clearY");
    this.add("clearZ");
    this.add(this.moveCommand(x, y, z));
    this.add("clearY");
    this.add("clearZ");
  }
  addPoints(index) {
    for(const p of points[index]) {
      let x = parseInt(Math.floor(p.x * this.scale));
      let y = parseInt(Math.floor(p.y * this.scale));
      this.add(this.moveCommand(x, y, y));
    }
  }
  driveTillHit() {
    this.driveTillHitFlag = true;
    this.addMove(0, this.driveSteps, this.driveSteps);
  }
  isMessageSendable() {
    return this.isWaitingForReply == false && this.isEmpty() == false;
  }
  isMessageQueueable() {
    return this.isWaitingForReply == false && this.isEmpty();
  }
  messageJustSent() {
    this.isWaitingForReply = true;
  }
  messageReceived() {
    this.isWaitingForReply = false;
    this.next();
  }
  isEmpty() {
    return this.queue.length == 0;
  }
  pop() {
    return this.queue.shift();
  }
  next() {
    if (this.isMessageSendable()) {
      ws.send(this.pop());
      this.messageJustSent();
    }
    if(this.isEmpty() && this.driveTillHitFlag) {
      this.addMove(0, this.driveSteps, this.driveSteps);
    }
  }
}
const cq = new CommandQueue();

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('client', (msg) => {
    console.log('message: ' + msg);
    if (msg.command == 'drive') {
      cq.addMove(0, msg.steps, msg.steps);
    }
    if (msg.command == 'driveTillHit') {
      cq.driveTillHit();
    }
    if (msg.command == 'letter') {
      cq.addPoints(msg.index);
    }
  });
});

ws.on('message', (data) => {
  console.log(data);
  cq.messageReceived();
  const p = data.split(' ');
  io.emit('position', { x: p[0], y: p[1], z: p[2] });
});

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
