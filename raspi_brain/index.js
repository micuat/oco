const fs = require('fs');
const loadJson = (f) => {
  return JSON.parse(fs.readFileSync(f));
}

const settings = loadJson('settings.json');
const points = loadJson('points.json');

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

class Point {
  constructor() {
    this.x = 0;
    this.y = 0;
  }
  add(p0) {
    const p = new Point();
    p.x = this.x + p0.x;
    p.y = this.y + p0.y;
    return p;
  }
}

class World {
  constructor() {
    this.relative = new Point();
    this.origin = new Point();
    this.angle = 0;
  }

  clearX() {
  }
  clearY() {
    this.origin.x += this.getRotatedRelative().x;
    this.origin.y += this.getRotatedRelative().y;
    this.relative.x = 0;
    this.relative.y = 0;
  }
  clearZ() {
  }
  moveToA(x, y) {
    this.relative.x = x;
    this.relative.y = y;
  }
  rotate(t) {
    this.angle += t;
  }
  getRotatedRelative() {
    const p = new Point();
    let t = this.angle * Math.PI / 180;
    p.x = Math.cos(t) * this.relative.x - Math.sin(t) * this.relative.y;
    p.y = Math.sin(t) * this.relative.x + Math.cos(t) * this.relative.y;
    return p;
  }
  getPosition() {
    return this.origin.add(this.getRotatedRelative());
  }
}

const world = new World();

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
        cq.hit = true;
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
    this.scale = 1;
    this.servoAngleOn = 80;
    this.servoAngleOff = 0;
    this.servoDelta = 500;
    this.hit = false;
    this.driveDelay = 200;
  }
  add(m) {
    this.queue.push(m);
  }
  addMove(x, y) {
    this.add(['moveToA', x, y]);
    this.add(['clearY']);
    this.add(['clearZ']);
  }
  addRotate(t) {
    this.add(['rotate', t]);
    this.add(['clearY']);
    this.add(['clearZ']);
  }
  addPoints(index) {
    let servoState = false;
    for (const p of points[index]) {
      if (servoState == false && p.stroke == true) {
        this.add(['servo', this.servoAngleOn, this.servoDelta]);
        servoState = true;
      }
      else if (servoState == true && p.stroke == false) {
        this.add(['servo', this.servoAngleOff, this.servoDelta]);
        servoState = false;
      }
      let x = parseInt(Math.floor(p.x * this.scale));
      let y = parseInt(Math.floor(p.y * this.scale));
      this.add(['moveToA', x, y]);
    }
    this.add(['servo', this.servoAngleOff, this.servoDelta]);
  }
  driveTillHit() {
    this.driveTillHitFlag = true;
    this.addMove(0, this.driveSteps);
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
      const command = this.pop();
      if (command[0] == 'clearX') {
        world.clearX();
        ws.send('clearX');
      }
      if (command[0] == 'clearY') {
        world.clearY();
        ws.send('clearY');
      }
      if (command[0] == 'clearZ') {
        world.clearZ();
        ws.send('clearZ');
      }
      if (command[0] == 'moveToA') {
        world.moveToA(command[1], command[2]);
        ws.send(`moveToA ${command[1]} ${command[2]} ${command[2]} ${this.driveDelay}`);
      }
      if (command[0] == 'rotate') {
        world.rotate(command[1]);
        ws.send(`moveToA 0 ${command[1] * 300} -${command[1] * 300} ${this.driveDelay}`);
      }
      if (command[0] == 'servo') {
        io.emit('servo', { angle: command[1] });
        ws.send(`servo ${command[1]} ${command[2]}`);
      }
      const p = world.getPosition();
      io.emit('world', { x: p.x, y: p.y });
      this.messageJustSent();
    }
    if (this.isEmpty() && this.driveTillHitFlag) {
      if (this.hit == false) {
        this.addMove(0, this.driveSteps, this.driveSteps);
      }
      else {
        this.driveTillHitFlag = false;
        this.hit = false;
        this.addMove(0, -this.driveSteps);
        this.addRotate(180);
      }
    }
  }
}
const cq = new CommandQueue();

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('client', (msg) => {
    console.log('message: ' + msg.command);
    switch (msg.command) {
      case 'drive':
        cq.addMove(0, msg.steps);
        break;
      case 'driveTillHit':
        cq.driveTillHit();
        break;
      case 'letter':
        cq.addPoints(msg.index);
        break;
      case 'rotate':
      console.log("hey")
        cq.addRotate(msg.angle);
        break;
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
