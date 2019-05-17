const { Client } = require('node-osc');

const hostname = '192.168.1.237';
// const hostname = '127.0.0.1';

let mode = "";
let position = {};

if(process.argv[2] == "home") {
  mode = "home";
}
else if(process.argv[2] == "moveto") {
  mode = "moveto";
  position.x = parseInt(process.argv[3]);
  position.y = parseInt(process.argv[4]);
}

const client = new Client(hostname, 3333);
let command = "";
if(mode == "home") {
  command = "G28";
}
else if(mode == "moveto") {
  command = `G0 X${position.x} Y${position.y}`;
}
client.send('/oco/command', command, () => {
  client.close();
});
