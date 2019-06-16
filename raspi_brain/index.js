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

    this.execCommand = {
      home: (command) => {
        this.send('home');
      },
      clearX: (command) => {
        this.send('clearX');
      },
      clearY: (command) => {
        this.send('clearY');
      },
      clearZ: (command) => {
        this.send('clearZ');
      },
      moveToA: (command) => {
        this.send(`moveToA ${command.x} ${command.y} ${command.y} ${this.driveDelay}`);
      },
      drive: (command) => {
        this.send(`drive ${command.x} ${command.y} ${command.y} ${this.driveDelay}`);
      },
      driveTillHit: (command) => {
        this.send(`driveTillHit ${this.driveDelay}`);
      },
      rotate: (command) => {
        this.send(`drive 0 ${command.deg * 1800} ${-command.deg * 1800} ${this.driveDelay}`);
      },
      servo: (command) => {
        this.send(`servo ${command.deg} ${command.delta} ${command.delay}`);
      },
    }
  }
  add(m) {
    this.queue.push(m);
  }
  addMove(x, y) {
    this.add({command: 'drive', x, y});
  }
  addRotate(deg) {
    this.add({command: 'rotate', deg});
  }
  home() {
    this.add({command: 'home'});
  }
  servoDown() {
    for(let i = this.servoAngleOff; i <= this.servoAngleOn; i+=2) {
      this.add({command: 'servo', deg: i, delta: this.servoDelta, delay: 0});
    }
    this.add({command: 'servo', deg: this.servoAngleOn, delta: this.servoDelta, delay: this.servoDelay});
    this.servoState = true;
  }
  servoUp() {
    for(let i = this.servoAngleOn; i >= this.servoAngleOff; i-=2) {
      this.add({command: 'servo', deg: i, delta: this.servoDelta, delay: 0});
    }
    this.add({command: 'servo', deg: this.servoAngleOff, delta: this.servoDelta, delay: this.servoDelay});
    this.servoState = false;
  }
  addPoints(index) {
    this.servoUp();
    for (const p of points[index]) {
      if (this.servoState == true && p.stroke == false) {
        this.servoUp();
      }
      // flip axes
      let x = parseInt(Math.floor(p.y * this.scale));
      let y = parseInt(Math.floor(p.x * this.scale * 10.0));
      this.add({command: 'moveToA', x, y});
      if (this.servoState == false && p.stroke == true) {
        this.servoDown();
      }
    }
    if(this.servoState == true) {
      this.servoUp();
    }
  }
  driveTillHit() {
    this.driveTillHitFlag = true;
    this.add({command: 'driveTillHit'});
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
      this.execCommand[command.command](command);
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
  cq.servoUp();
  cq.home();
  cq.add({command: 'clearY'});
  cq.add({command: 'clearZ'});
});

ws.on('message', (data) => {
  console.log('\t\t\t\t<= ', data);
  cq.messageReceived();
  const p = data.split(' ');
  io.emit('position', { x: p[0], y: p[1], z: p[2] });
});
