const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const port = new SerialPort("/dev/ttyACM0", { baudRate: 250000 })

const parser = new Readline()


const { Server } = require('node-osc');
const { Client } = require('node-osc');
const hostname = "192.168.1.140";
const oscServer = new Server(3333, '0.0.0.0');
const oscClient = new Client(hostname, 3334);

let isSent = false;
oscServer.on('message', function (msg) {
  const address = msg[0];
  if(address == '/oco/command') {
    const command = msg[1];
    console.log(`execute: ${command}`);
    port.write(`${command}\n`);
    isSent = true;
  }
});


port.pipe(parser)

parser.on('data', line => {
  if(line.trim() == "wait") {
    process.stdout.write("|");
  }
  else {
    console.log(`\n> ${line}`)
    if(isSent) {
      oscClient.send("/oco/response", line, () => {
        isSent = false;
      });
    }
  }
})
