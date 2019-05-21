import websockets.*;

WebsocketClient wsc;
int now;
boolean isMessageSent = false;
int mult = 10;

int realX = 0;
int realY = 0;

int prevMouseX = 0;
int prevMouseY = 0;

int[] trace = new int[512];
int head = 0;

void setup() {
  size(800, 800);
  wsc= new WebsocketClient(this, "ws://192.168.1.237:8080/");
  now=millis();
}

void draw() {
  background(255);
  for (int i = 0; i < trace.length; i+= 4) {
    line(trace[i], trace[i+1], trace[i+2], trace[i+3]);
  }
  ellipse(realX / mult, realY / mult, 20, 20);
  if (isMessageSent == false) {
    if (mouseX != prevMouseX && mouseY != prevMouseY) {
      wsc.sendMessage("moveToA " + (mouseX * mult) + " " + (mouseY * mult) + " 0");
      now=millis();
      isMessageSent = true;

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
}

void mousePressed() {
  wsc.sendMessage("servo 100");
}

void mouseReleased() {
  wsc.sendMessage("servo 0");
}

void webSocketEvent(String msg) {
  isMessageSent = false;

  println(msg);
  realX = parseInt(msg.split(" ")[0]);
  realY = parseInt(msg.split(" ")[1]);
}
