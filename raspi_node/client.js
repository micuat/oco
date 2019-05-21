const { Client } = require('node-osc');
const { Server } = require('node-osc');

const hostname = '192.168.1.237';
// const hostname = '127.0.0.1';

let mode = "";
let position = {};

if(process.argv[2] == "home") {
  mode = "home";
}
else if(process.argv[2] == "moveToA") {
  mode = "moveToA";
  position.x = parseInt(process.argv[3]);
  position.y = parseInt(process.argv[4]);
}
else if(process.argv[2] == "moveToR") {
  mode = "moveToR";
  position.x = parseInt(process.argv[3]);
  position.y = parseInt(process.argv[4]);
}

const oscServer = new Server(3334, '0.0.0.0');
const oscClient = new Client(hostname, 3333);

let command = "";
if(mode == "home") {
  command = "home";
}
else if(mode == "moveToA") {
  command = `moveToA ${position.x} ${position.y} 0`;
}
else if(mode == "moveToR") {
  command = `moveToR ${position.x} ${position.y} 0`;
}

oscServer.on('message', function (msg) {
  const address = msg[0];
  console.log(`reply: ${msg}`);
  if(count < 80)
    next();
});

let count = 0;
function next() {
  let r = 10000;
  let x = Math.floor(r + Math.cos(count * 0.05 * 0.5 * Math.PI) * r);
  let y = Math.floor(r + Math.sin(count * 0.05 * 0.5 * Math.PI) * r);
  oscClient.send('/oco/command', `moveToA ${x} ${y} 0`, () => {
    console.log(`moveToA ${x} ${y} 0`)
    if(count >= 80) {
      oscClient.close();
    }
    else {
      // let waitTime = 50;
      // if(count == 0) waitTime = 2000;
      count+=10;
      // setTimeout(next, waitTime);
    }
  });
}

next();