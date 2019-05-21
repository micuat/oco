const WebSocket = require('ws');

const ws = new WebSocket('ws://192.168.1.237:8080');

ws.on('open', function open() {
  ws.send('home');
});

ws.on('message', function incoming(data) {
  console.log(data);
});