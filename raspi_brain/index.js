const fs = require('fs');
const loadJson = (f) => {
  return JSON.parse(fs.readFileSync(f));
}

const settings = loadJson('settings.json');
const points = loadJson('points.json');

const WebSocket = require('ws');
const ws = new WebSocket(settings.wsUrl);

const express = require('express');
const app = express();
const http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/', express.static('static'));
http.listen(settings.httpPort, () => {
  console.log('listening on *:' + settings.httpPort);
});

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

class CommandQueue {
  constructor() {
    this.queue = [];
    this.isWaitingForReply = false;
    this.driveTillHitFlag = false;
    this.driveSteps = 1000;
    this.handler = setInterval(() => {
      this.next();
    }, 10);
    this.scale = 40;
    this.servoAngleOn = 80;
    this.servoAngleOff = 0;
    this.servoDelta = 2;
    this.servoDelay = 1000;
    this.hit = false;
    this.driveDelay = 100;
  }
  add(m) {
    this.queue.push(m);
  }
  addMove(x, y) {
    this.add(['drive', x, y]);
  }
  addRotate(t) {
    this.add(['rotate', t]);
  }
  home() {
    this.add(['home']);
  }
  addPoints(index) {
    for(let i = this.servoAngleOn; i >= this.servoAngleOff; i-=2) {
      this.add(['servo', i, this.servoDelta, 0]);
    }
    this.add(['servo', this.servoAngleOff, this.servoDelta, this.servoDelay]);
    let servoState = false;
    for (const p of points[index]) {
      if (servoState == true && p.stroke == false) {
        for(let i = this.servoAngleOn; i >= this.servoAngleOff; i-=2) {
          this.add(['servo', i, this.servoDelta, 0]);
        }
        this.add(['servo', this.servoAngleOff, this.servoDelta, this.servoDelay]);
        servoState = false;
      }
      // flip axes
      let x = parseInt(Math.floor(p.y * this.scale));
      let y = parseInt(Math.floor(p.x * this.scale * 10.0));
      this.add(['moveToA', x, y]);
      if (servoState == false && p.stroke == true) {
        for(let i = this.servoAngleOff; i <= this.servoAngleOn; i+=2) {
          this.add(['servo', i, this.servoDelta, 0]);
        }
        this.add(['servo', this.servoAngleOn, this.servoDelta, this.servoDelay]);
        servoState = true;
      }
    }
    if(servoState == true) {
      for(let i = this.servoAngleOn; i >= this.servoAngleOff; i-=2) {
        this.add(['servo', i, this.servoDelta, 0]);
      }
      this.add(['servo', this.servoAngleOff, this.servoDelta, this.servoDelay]);
      servoState = false;
    }
  }
  driveTillHit() {
    this.driveTillHitFlag = true;
    this.add(['driveTillHit']);
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
  send(s) {
    ws.send(s);
    console.log('=> ' + s);
  }
  next() {
    if (this.isMessageSendable()) {
      const command = this.pop();
      if (command[0] == 'home') {
        world.clearX();
        this.send('home');
      }
      if (command[0] == 'clearX') {
        world.clearX();
        this.send('clearX');
      }
      if (command[0] == 'clearY') {
        world.clearY();
        this.send('clearY');
      }
      if (command[0] == 'clearZ') {
        world.clearZ();
        this.send('clearZ');
      }
      if (command[0] == 'moveToA') {
        world.moveToA(command[1], command[2]);
        this.send(`moveToA ${command[1]} ${command[2]} ${command[2]} ${this.driveDelay}`);
      }
      if (command[0] == 'drive') {
        world.moveToA(command[1], command[2]);
        this.send(`drive ${command[1]} ${command[2]} ${command[2]} ${this.driveDelay}`);
      }
      if (command[0] == 'driveTillHit') {
        world.moveToA(command[1], command[2]);
        this.send(`driveTillHit ${this.driveDelay}`);
      }
      if (command[0] == 'rotate') {
        world.rotate(command[1]);
        this.send(`drive 0 ${command[1] * 1800} -${command[1] * 1800} ${this.driveDelay}`);
      }
      if (command[0] == 'servo') {
        io.emit('servo', { angle: command[1] });
        this.send(`servo ${command[1]} ${command[2]} ${command[3]}`);
      }
      const p = world.getPosition();
      io.emit('world', { x: p.x, y: p.y });
      this.messageJustSent();
    }
    if (this.isEmpty() && this.driveTillHitFlag) {
      this.driveTillHitFlag = false;
      this.hit = false;
      this.addMove(0, -this.driveSteps * 9);
      this.addRotate(90);
    }
  }
}
const cq = new CommandQueue();

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('client', (msg) => {
    console.log('message: ' + msg.command);
    switch (msg.command) {
      case 'home':
        cq.home();
        break;
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
        cq.addRotate(msg.angle);
        break;
    }
  });
});

ws.on('open', () => {
  cq.home();
  cq.add(['clearY']);
  cq.add(['clearZ']);
});

ws.on('message', (data) => {
  console.log('\t\t\t\t<= ', data);
  cq.messageReceived();
  const p = data.split(' ');
  io.emit('position', { x: p[0], y: p[1], z: p[2] });
});
