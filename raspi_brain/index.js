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
  constructor(settings) {
    this.queue = [];
    this.isWaitingForReply = false;
    this.handler = setInterval(() => {
      this.next();
    }, 10);
    this.scale = settings.scale;
    this.servoAngleOn = settings.servoAngleOn;
    this.servoAngleOff = settings.servoAngleOff;
    this.servoDelta = settings.servoDelta;
    this.servoDelay = settings.servoDelay;
    this.hit = false;
    this.driveDelay = settings.driveDelay;
    this.yScale = settings.yScale;
    this.bumperCount = settings.bumperCount;
    this.distanceThreshold = settings.distanceThreshold;

    this.execCommand = {
      home: (command) => {
        this.send('home');
      },
      setParams: (command) => {
        this.send(`setSpeed ${this.driveDelay}`);
        this.send(`setDistanceTh ${this.distanceThreshold}`);
        this.send(`setBumperCount ${this.bumperCount}`);
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
        this.send(`m ${command.x} ${command.y} ${command.y} ${command.ignoreBumper}`);
      },
      drive: (command) => {
        this.send(`d ${command.x} ${command.y} ${command.y} ${command.ignoreBumper}`);
      },
      driveTillHit: (command) => {
        this.send(`driveTillHit ${this.driveDelay}`);
      },
      rotate: (command) => {
        let y = parseInt(command.deg * 19000.0 / 9.0 * settings.rotmult);
        this.send(`d 0 ${y} ${-y} ${command.ignoreBumper}`);
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
      let x = parseInt(Math.floor((400-p.y) * this.scale));
      let y = parseInt(Math.floor((300-p.x) * this.scale * cq.yScale));
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
    this.servoUp();

    const unit = settings.unit * this.scale * this.yScale;
    //this.add({ command: 'drive', x: 0, y: unit, ignoreBumper: 1 });

    //this.add({ command: 'drive', x: 0, y: -unit, ignoreBumper: 1 });
    this.add({ command: 'drive', x: 0, y: -unit, ignoreBumper: 1 });
    let deg = 0;
    if(Math.random() > 0.5) {
      deg = 180 - Math.random() * 30;
    }
    else {
      deg = -180 + Math.random() * 30;
    }
    for(let i = 0; i < 10; i++) {
      this.add({ command: 'rotate', deg: deg * 0.1, ignoreBumper: 1 });
    }

    // distance should be random
    this.add({ command: 'drive', x: 0, y: unit, ignoreBumper: 1 });

    this.add({ command: 'clearY' });
    this.add({ command: 'clearZ' });
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
const cq = new CommandQueue(settings);

io.on('connection', (socket) => {
  console.log('a socket io user connected');
  socket.on('saveSettings', (msg) => {
    const newSettings = JSON.stringify({...settings, ...msg,});

    fs.writeFile('settings.json', newSettings, error => console.error);
    console.log('message: ' + newSettings);
  });
  socket.on('restart', (msg) => {
    process.exit();
  })
});

let lastCommand = 0;
ws.on('open', () => {
  cq.servoUp();
  cq.add({ command: 'home' });
  cq.add({ command: 'clearY' });
  cq.add({ command: 'clearZ' });
  cq.add({ command: 'setParams' });

  if (autopilot) {

    setInterval(() => {
      if(cq.isEmpty()) {
        if(lastCommand < 2 +Math.random()*2) {
          cq.addPoints(parseInt(Math.floor(Math.random() * points.length)));
          cq.add({ command: 'home' });
          cq.add({ command: 'moveToA', x: 0, y: 300 * cq.scale * cq.yScale, ignoreBumper: 0 });
          cq.add({ command: 'clearY' });
          cq.add({ command: 'clearZ' });
          // next command should be random?
          lastCommand += 1;
        }
        else {
          // distance should be random
          const unit = 300 * cq.scale * cq.yScale;
          cq.add({ command: 'drive', x: 0, y: unit, ignoreBumper: 0 });
          cq.uturn();
          lastCommand = 0;
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
    lastCommand = 0;
  }
  io.emit('position', { x, y, z });
});
