const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

function loadSettings() {
  const fs = require("fs");
  return JSON.parse(fs.readFileSync("settings.json"));
}

const settings = loadSettings();

const port = new SerialPort(settings.serialPort, { baudRate: 250000 })

const parser = new Readline()

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const wslistners = [];

wss.on('connection', function connection(ws) {
  wslistners.push(ws);
  ws.on('message', function incoming(message) {
    console.log('execute: %s', message);

    port.write(`${message}\n`);
  });
  ws.on('close', _ => {
    console.log('closed ws');
    let index = wslistners.indexOf(ws);
    if (index != -1) wslistners.splice(index, 1);
  });
});

port.pipe(parser)

parser.on('data', line => {
  if(line.startsWith("debug")) {
    console.log(`> ${line}`)
  }
  else {
    console.log(`> ${line}`)
    for(let ws of wslistners) {
      ws.send(line);
    }
  }
})
