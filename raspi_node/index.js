const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

function loadSettings() {
  const fs = require("fs");
  return JSON.parse(fs.readFileSync("settings.json"));
}

const settings = loadSettings();

let portOpened = true;
const port = new SerialPort(settings.serialPort, { baudRate: settings.baudRate }, (err) => {
  console.log(err)
  portOpened = false;
})

const express = require('express');
const app = express();
const http = require('http').Server(app);
app.use('/', express.static('static'));
http.listen(settings.httpPort, () => {
  console.log('listening on *:' + settings.httpPort);
});

const parser = new Readline()

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: settings.wsPort });

const wslistners = [];

const { exec } = require('child_process');

const position = { x: 0, y: 0, z: 0 };

wss.on('connection', function connection(ws) {
  wslistners.push(ws);
  console.log('client connected; number of clients: ' + wslistners.length)
  ws.on('message', function incoming(message) {
    if (message == 'dance') {
      exec('node /home/pi/oco/raspi_node/wsclient.js', (err, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
      });
    }
    else {
      console.log('execute: %s', message);
      port.write(`${message}\n`);

      if (portOpened == false) {
        const commands = message.split(' ');
        if (commands[0] == 'moveToA') {
          position.x = commands[1];
          position.y = commands[2];
          position.z = commands[3];
        }
        if (commands[0] == 'clearX') {
          position.x = 0;
        }
        if (commands[0] == 'clearY') {
          position.y = 0;
        }
        if (commands[0] == 'clearZ') {
          position.z = 0;
        }
        for (let ws of wslistners) {
          ws.send(`${position.x} ${position.y} ${position.z}`);
        }
      }
    }
  });
  ws.on('close', _ => {
    console.log('client disconnected');
    let index = wslistners.indexOf(ws);
    if (index != -1) wslistners.splice(index, 1);
  });
});

port.pipe(parser)

parser.on('data', line => {
  if (line.startsWith("debug")) {
    console.log(`> ${line}`)
  }
  else {
    console.log(`> ${line}`)
    for (let ws of wslistners) {
      ws.send(line);
    }
  }
})
