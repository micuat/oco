import websockets.*;

WebsocketClient wsc;
boolean isWaitingForReply = false;
int mult = 10;

int realX = 0;
int realY = 0;

int prevMouseX = 0;
int prevMouseY = 0;

int[] trace = new int[512];
int head = 0;


class CommandQueue {
  ArrayList<String> commands = new ArrayList<String>();

  void add(String s) {
    commands.add(s);
  }

  boolean isEmpty() {
    return commands.isEmpty();
  }

  String pop() {
    if (commands.size() > 0) {
      return commands.remove(0);
    } else return "";
  }
}

CommandQueue commandQueue = new CommandQueue();

void setup() {
  size(800, 800);
  wsc= new WebsocketClient(this, "ws://192.168.1.237:8080/");
}

void sendNextMessage() {
  if (isWaitingForReply == false && commandQueue.isEmpty() == false) {
    wsc.sendMessage(commandQueue.pop());
    isWaitingForReply = true;
  }
}

void draw() {
  background(255);
  for (int i = 0; i < trace.length; i+= 4) {
    line(trace[i], trace[i+1], trace[i+2], trace[i+3]);
  }
  ellipse(realX / mult, realY / mult, 20, 20);
  if (isWaitingForReply == false && commandQueue.isEmpty()) {
    if (mouseX != prevMouseX && mouseY != prevMouseY) {
      commandQueue.add("moveToA " + (mouseX * mult) + " " + (mouseY * mult) + " 0");

      if (mousePressed) {
        trace[head++] = mouseX;
        trace[head++] = mouseY;
        trace[head++] = prevMouseX;
        trace[head++] = prevMouseY;
        if (head >= trace.length) head = 0;
      }

      prevMouseX = mouseX;
      prevMouseY = mouseY;
    }
  }
  sendNextMessage();
}

void mousePressed() {
  commandQueue.add("servo 100");
}

void mouseReleased() {
  commandQueue.add("servo 0");
}

void keyPressed() {
  if (key == ' ') {
    if (isWaitingForReply == false) {
      commandQueue.add("moveToA 0 " + (mouseY * mult) + " 0");
      commandQueue.add("clearY");
      commandQueue.add("moveToA 0 10000 0");
      commandQueue.add("clearY");
    }
  }
}

void webSocketEvent(String msg) {
  isWaitingForReply = false;

  println(msg);
  realX = parseInt(msg.split(" ")[0]);
  realY = parseInt(msg.split(" ")[1]);
}
