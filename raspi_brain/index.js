const fs = require('fs');
const loadJson = (f) => {
  return JSON.parse(fs.readFileSync(f));
}

const settings = loadJson('settings.json');
const points = loadJson('points.json');

const Status = {
  normal: 0,
  x_stopped: 1,
  bumper_stopped: 2,
  unknown: 3
}

const autopilot = settings.autopilot == true;

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
    this.driveSteps = 1000;
    this.handler = setInterval(() => {
      this.next();
    }, 10);
    this.scale = 40;
    this.servoAngleOn = 80+20;
    this.servoAngleOff = 0+20;
    this.servoDelta = 2;
    this.servoDelay = 1000;
    this.hit = false;
    this.driveDelay = 10;
    this.yScale = 1;

    this.execCommand = {
      home: (command) => {
        this.send('home');
      },
      wait: (command) => {
        this.send(`wait ${command.delay}`);
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
        this.send(`moveToA ${command.x} ${command.y} ${command.y} ${this.driveDelay} ${command.ignoreBumper}`);
      },
      drive: (command) => {
        this.send(`drive ${command.x} ${command.y} ${command.y} ${this.driveDelay} ${command.ignoreBumper}`);
      },
      driveTillHit: (command) => {
        this.send(`driveTillHit ${this.driveDelay}`);
      },
      rotate: (command) => {
        this.send(`drive 0 ${parseInt(command.deg * 19000.0 / 9.0)} ${-parseInt(command.deg * 19000.0 / 9.0)} ${this.driveDelay} ${command.ignoreBumper}`);
      },
      servo: (command) => {
        this.send(`servo ${command.deg} ${command.delta} ${command.delay}`);
      },
    }
  }
  add(m) {
    this.queue.push(m);
  }
  servoDown() {
    for (let i = this.servoAngleOff; i <= this.servoAngleOn; i += 2) {
      this.add({ command: 'servo', deg: i, delta: this.servoDelta, delay: 0 });
    }
    this.add({ command: 'servo', deg: this.servoAngleOn, delta: this.servoDelta, delay: this.servoDelay });
    this.servoState = true;
  }
  servoUp() {
    for (let i = this.servoAngleOn; i >= this.servoAngleOff; i -= 2) {
      this.add({ command: 'servo', deg: i, delta: this.servoDelta, delay: 0 });
    }
    this.add({ command: 'servo', deg: this.servoAngleOff, delta: this.servoDelta, delay: this.servoDelay });
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
      let y = parseInt(Math.floor(p.x * this.scale * cq.yScale));
      this.add({ command: 'moveToA', x, y, ignoreBumper: 0 });
      if (this.servoState == false && p.stroke == true) {
        this.servoDown();
      }
    }
    if (this.servoState == true) {
      this.servoUp();
    }
  }
  uturn() {
    this.add({ command: 'drive', x: 0, y: -this.driveSteps * 9, ignoreBumper: 1 });
    this.add({ command: 'rotate', deg: 90, ignoreBumper: 0 });
  }
  driveTillHit() {
    this.add({ command: 'driveTillHit' });
    this.uturn();
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
  clear() {
    this.queue.length = 0;
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
  }
}
const cq = new CommandQueue();

io.on('connection', (socket) => {
  console.log('a user connected');
  if (autopilot == false) {
    socket.on('client', (msg) => {
      console.log('message: ' + msg.command);
      switch (msg.command) {
        case 'home':
          cq.add({ command: 'home' });
          break;
        case 'drive':
          cq.add({ command: 'drive', x: 0, y: msg.steps, ignoreBumper: 0 });
          break;
        case 'driveTillHit':
          cq.driveTillHit();
          break;
        case 'letter':
          cq.addPoints(msg.index);
          cq.add({ command: 'moveToA', x: 0, y: 800 * cq.scale * cq.yScale, ignoreBumper: 0 });
          cq.add({ command: 'clearY' });
          cq.add({ command: 'clearZ' });
          break;
        case 'rotate':
          cq.add({ command: 'rotate', deg: msg.angle, ignoreBumper: 0 });
          break;
      }
    });
  }
});

ws.on('open', () => {
  cq.servoUp();
  cq.add({ command: 'home' });
  cq.add({ command: 'clearY' });
  cq.add({ command: 'clearZ' });

  if (autopilot) {
    let lastCommand = 'write';

    setInterval(() => {
      const unit = 40; //800
      if(cq.isEmpty()) {
        if(lastCommand == 'drive') {
          cq.addPoints(parseInt(Math.floor(Math.random() * points.length)));
          cq.add({ command: 'moveToA', x: 0, y: 800 * cq.scale * cq.yScale, ignoreBumper: 0 });
          cq.add({ command: 'clearY' });
          cq.add({ command: 'clearZ' });
          // next command should be random?
          lastCommand = 'write';
        }
        else {
          // distance should be random
          for(let i = 0; i < 5; i++) {
            cq.add({ command: 'drive', x: 0, y: unit * cq.scale * cq.yScale, ignoreBumper: 0 });
          }

          cq.add({ command: 'drive', x: 0, y: -unit * cq.scale * cq.yScale, ignoreBumper: 0 });
          let deg = 0;
          if(Math.random() > 0.5) {
            deg = 180 - Math.random() * 90;
          }
          else {
            deg = -180 + Math.random() * 90;
          }
          for(let i = 0; i < 10; i++) {
            cq.add({ command: 'rotate', deg: deg * 0.1, ignoreBumper: 0 });
          }

          // distance should be random
          cq.add({ command: 'drive', x: 0, y: unit * cq.scale * cq.yScale, ignoreBumper: 0 });

          cq.add({ command: 'clearY' });
          cq.add({ command: 'clearZ' });
          lastCommand = 'drive';
        }
      }
    }, 1000);
  }
});

ws.on('message', (data) => {
  console.log('\t\t\t\t<= ', data);
  cq.messageReceived();
  const p = data.split(' ');
  let x = p[0];
  let y = p[1];
  let z = p[2];
  let servo = p[3];
  let status = p[4];
  if (status == Status.x_stopped) {
    cq.clear();
    cq.add({ command: 'home' });
  }
  if (status == Status.bumper_stopped) {
    cq.clear();
    cq.uturn();
  }
  io.emit('position', { x, y, z });
});
