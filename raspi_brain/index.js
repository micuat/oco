function loadSettings() {
  const fs = require("fs");
  return JSON.parse(fs.readFileSync("settings.json"));
}

const settings = loadSettings();

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
    this.handler = setInterval(() => {
      this.next();
    }, 10);
  }
  moveCommand(x, y, z) {
    return "moveToA " + x + " " + y + " " + z + " 200";
  }
  add(m) {
    this.queue.push(m);
  }
  addMoveCommand(x, y, z) {
    this.add(this.moveCommand(x, y, z));
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
  }
}
const cq = new CommandQueue();

const addMove = (x, y, z) => {
  cq.add("clearY");
  cq.add("clearZ");
  cq.addMoveCommand(x, y, z);
  cq.add("clearY");
  cq.add("clearZ");
}

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('client', (msg) => {
    console.log('message: ' + msg);
    if(msg.command == 'drive') {
      addMove(0, msg.steps, msg.steps);
    }
    if(msg.command == 'driveTillHit') {
      const steps = 1000;
      addMove(0, steps, steps);
    }
  });
});

ws.on('message', function incoming(data) {
  console.log(data);
  cq.messageReceived();
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
