const { Client } = require('node-osc');

const hostname = '192.168.1.237';
// const hostname = '127.0.0.1';

const client = new Client(hostname, 3333);
client.send('/oco/command', "G0 X1", () => {
  client.close();
});
