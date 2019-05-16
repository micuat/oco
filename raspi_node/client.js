const { Client } = require('node-osc');

const client = new Client('127.0.0.1', 3333);
client.send('/oco/command', "G28", () => {
  client.close();
});
