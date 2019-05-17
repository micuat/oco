const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const port = new SerialPort("/dev/ttyACM0", { baudRate: 250000 })

const parser = new Readline()


const { Server } = require('node-osc');
const oscServer = new Server(3333, '0.0.0.0');

oscServer.on('message', function (msg) {
  const address = msg[0];
  if(address == '/oco/command') {
    const command = msg[1];
    console.log(`execute: ${command}`);
    port.write(`${command}\n`);
  }
});


port.pipe(parser)

parser.on('data', line => {
  if(line.trim() == "wait") {
    process.stdout.write("|");
  }
  else {
    console.log(`\n> ${line}`)
  }
})
