import websockets.*;

WebsocketClient wsc;
int mult = 10;

int realX = 0;
int realY = 0;

int prevMouseX = 0;
int prevMouseY = 0;

int[] trace = new int[512];
int head = 0;


class CommandQueue {
  ArrayList<String> commands = new ArrayList<String>();
  boolean isWaitingForReply = false;

  void add(String s) {
    commands.add(s);
  }

  boolean isMessageSendable() {
    return isWaitingForReply == false && isEmpty() == false;
  }

  boolean isMessageQueueable() {
    return isWaitingForReply == false && isEmpty();
  }

  void messageJustSent() {
    isWaitingForReply = true;
  }

  void messageReceived() {
    isWaitingForReply = false;
  }

  boolean isEmpty() {
    return commands.isEmpty();
  }

  String pop() {
    if (commands.size() > 0) {
      return commands.remove(0);
    } else return "";
  }

  void sendNextMessage() {
    if (isMessageSendable()) {
      wsc.sendMessage(pop());
      messageJustSent();
    }
  }
}

CommandQueue commandQueue = new CommandQueue();

void setup() {
  size(800, 800);
  wsc= new WebsocketClient(this, "ws://192.168.4.1:8080/");
}

void draw() {
  background(255);
  for (int i = 0; i < trace.length; i+= 4) {
    line(trace[i], trace[i+1], trace[i+2], trace[i+3]);
  }
  ellipse(realX / mult, realY / mult, 20, 20);
  if (commandQueue.isMessageQueueable()) {
    if (mouseX != prevMouseX && mouseY != prevMouseY) {
      commandQueue.add("moveToA " + (mouseX * mult) + " " + (mouseY * mult) + " " + (mouseY * mult));

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
  commandQueue.sendNextMessage();
}

void mousePressed() {
  commandQueue.add("servo 100");
}

void mouseReleased() {
  commandQueue.add("servo 0");
}

void keyPressed() {
  if (key == ' ') {
    if (commandQueue.isMessageQueueable()) {
      commandQueue.add("moveToA 0 " + (mouseY * mult) + " " + (mouseY * mult));
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
      commandQueue.add("moveToA 0 10000 10000");
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
    }
  }
  if (key == 'r') { // rotate
    if (commandQueue.isMessageQueueable()) {
      commandQueue.add("moveToA 0 " + (mouseY * mult) + " " + (mouseY * mult));
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
      commandQueue.add("moveToA 0 10000 -10000");
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
    }
  }
  if (key == 'h') {
    if (commandQueue.isMessageQueueable()) {
      commandQueue.add("home");
    }
  }
}

void webSocketEvent(String msg) {
  commandQueue.messageReceived();

  println(msg);
  realX = parseInt(msg.split(" ")[0]);
  realY = parseInt(msg.split(" ")[1]);
}
