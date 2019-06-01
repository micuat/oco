import websockets.*;

WebsocketClient wsc;
int mult = 20;

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
  
  JSONObject json = loadJSONObject("settings.json");

  String serverAddress = json.getString("serverAddress");
  wsc= new WebsocketClient(this, serverAddress);
}

String moveCommand(int x, int y, int z) {
  return "moveToA " + x + " " + y + " " + z + " 200";
}

void draw() {
  background(255);
  for (int i = 0; i < trace.length; i+= 4) {
    line(trace[i], trace[i+1], trace[i+2], trace[i+3]);
  }
  ellipse(realX / mult, realY / mult, 20, 20);
  if (commandQueue.isMessageQueueable()) {
    if (mouseX != prevMouseX && mouseY != prevMouseY) {
      commandQueue.add(moveCommand(16000-mouseX * mult, mouseY * mult, mouseY * mult));

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
  commandQueue.add("servo 80");
}

void mouseReleased() {
  commandQueue.add("servo 0");
}

void keyPressed() {
  if (key == 'w' || key == 'a' || key == 'd' || key == 'x' ) {
    if (commandQueue.isMessageQueueable()) {
      commandQueue.add(moveCommand(0, mouseY * mult, mouseY * mult));
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
      if(key == 'w') { // forward
        commandQueue.add(moveCommand(0, 10000, 10000));
      }
      if(key == 'a') { // left ?
        commandQueue.add(moveCommand(0, -10000, 10000));
      }
      if(key == 'd') { // right ?
        commandQueue.add(moveCommand(0, 10000, -10000));
      }
      if(key == 'x') { // backward
        commandQueue.add(moveCommand(0, -10000, -10000));
      }
      commandQueue.add("clearY");
      commandQueue.add("clearZ");
    }
  }
  if (key == 'h') {
    if (commandQueue.isMessageQueueable()) {
      commandQueue.add("home");
    }
  }
  if(key >= '1' && key <= '9') {
    commandQueue.add("servo " + ((key - '0') * 10));
  }
}
void keyReleased() {
  if(key >= '1' && key <= '9') {
    commandQueue.add("servo 0");
  }
}
void webSocketEvent(String msg) {
  commandQueue.messageReceived();

  println(msg);
  realX = 16000-parseInt(msg.split(" ")[0]);
  realY = parseInt(msg.split(" ")[1]);
}
