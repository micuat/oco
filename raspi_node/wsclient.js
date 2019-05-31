const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8080');

class CommandQueue {
  constructor() {
    this.queue = [];
    this.isWaitingForReply = false;
  }
  add(m) {
    this.queue.push(m);
  }
  isMessageSendable() {
    return this.isWaitingForReply == false && this.isEmpty() == false;
  }
  isMessageQueueable() {
    return this.isWaitingForReply == false && this.isEmpty();
  }
  messageJustSent() {
    this.isWaitingForReply = true;
  }
  messageReceived() {
    this.isWaitingForReply = false;
  }
  isEmpty() {
    return this.queue.length == 0;
  }
  pop() {
    return this.queue.shift();
  }
  next() {
    if (this.isMessageSendable()) {
      ws.send(this.pop());
      this.messageJustSent();
    }
  }
}
const cq = new CommandQueue();

function moveCommand(x, y, z) {
  return "moveToA " + x + " " + y + " " + z + " 200";
}
setInterval(() => {
  cq.next();
}, 100);

let direction = 1;
ws.on('open', function open() {
  setInterval(() => {
    cq.add("clearY");
    cq.add("clearZ");
    cq.add(moveCommand(0, 10000 * direction, 10000 * direction));
    cq.add("clearY");
    cq.add("clearZ");
    direction *= -1;
  }, 5000);
});

ws.on('message', function incoming(data) {
  console.log(data);
  cq.messageReceived();
});