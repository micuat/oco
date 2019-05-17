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

let count = 0;
function next() {
  let r = 10;
  let x = (r + Math.cos(count * 0.01 * 0.5 * Math.PI) * r);
  let y = (r + Math.sin(count * 0.01 * 0.5 * Math.PI) * r);
  client.send('/oco/command', `G0 X${x} Y${y}`, () => {
  console.log(`G0 X${x} Y${y}`)
    if(count >= 100) {
      client.close();
    }
    else {
      let waitTime = 50;
      if(count == 0) waitTime = 2000;
      count++;
      setTimeout(next, waitTime);
    }
  });
}

next();