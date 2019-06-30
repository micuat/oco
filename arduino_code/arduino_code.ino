#include "PololuDriver.h"
#include "Ramps.h"
#include "SerialCommand.h"

#include <SoftwareSerial.h>
//#include "MeAuriga.h"

MeSmartServo mysmartservo(PORT5); // somehow goes to tx2/rx2 of mega

SerialCommand command;

int servoPos = 0;
int STATUS_UNKNOWN = 3;

Ramps ramps = Ramps();

void printPosition(int result) {
  Serial.print(ramps.motorX.position, DEC);
  Serial.print(" ");
  Serial.print(ramps.motorY.position, DEC);
  Serial.print(" ");
  Serial.print(ramps.motorZ.position, DEC);
  Serial.print(" ");
  Serial.print(servoPos, DEC);
  Serial.print(" ");
  Serial.print(result, DEC);
  Serial.println("");
}

int pin_12v0 = 10;
int pin_12v1 = 9;

int pin_bumper0 = 23;

void setup()
{
  pinMode(pin_bumper0, INPUT_PULLUP);
  ramps.pin_bumper0 = pin_bumper0;

  pinMode(pin_12v0, OUTPUT);
  pinMode(pin_12v1, OUTPUT);
  digitalWrite(pin_12v0, HIGH);
  digitalWrite(pin_12v1, HIGH);

  Serial.begin(250000);
  
  command.addCommand("home", homeX);
  command.addCommand("m", moveTo);
  command.addCommand("servo", rotServo);
  command.addCommand("clearX", clearX);
  command.addCommand("clearY", clearY);
  command.addCommand("clearZ", clearZ);
  command.addCommand("d", drive);
  command.addCommand("wait", wait);
  command.addCommand("setSpeed", setSpeed);
  command.addCommand("setDistanceTh", setDistanceTh);
  command.addCommand("setBumperCount", setBumperCount);

  delay(1000);
  mysmartservo.begin(115200);
  delay(5);
  mysmartservo.assignDevIdRequest();
  delay(50);
  mysmartservo.moveTo(0,0,50);

  delay(2000);
  digitalWrite(pin_12v0, LOW);
  digitalWrite(pin_12v1, LOW);

  delay(2000);
  digitalWrite(pin_12v0, HIGH);
  digitalWrite(pin_12v1, HIGH);

  Serial.println("started...");
  delay(500);
}

void loop()
{
  command.readSerial();
}

void homeX() {
  ramps.homeX(100);
  clearX();
}

void clearX() {
  ramps.motorX.position = 0;
  printPosition(STATUS_UNKNOWN);
}

void clearY() {
  ramps.motorY.position = 0;
  printPosition(STATUS_UNKNOWN);
}

void clearZ() {
  ramps.motorZ.position = 0;
  printPosition(STATUS_UNKNOWN);
}

long xPos, yPos, zPos;

int speed = 100;
int distanceThreshold = 100;
int bumperCount = 0;

void moveTo() {
  char *arg;
  arg = command.next();
  xPos = atol(arg);
  arg = command.next();
  yPos = atol(arg);
  arg = command.next();
  zPos = atol(arg);

  int res = ramps.moveTo(xPos, yPos, zPos, speed, bumperCount, distanceThreshold);
  printPosition(res);
}

void rotServo() {
  char *arg;
  arg = command.next();
  servoPos = min(max(0, atoi(arg)), 360);
  arg = command.next();
  int delta = max(0, atoi(arg));
  arg = command.next();
  int sleepMs = max(0, atoi(arg));

  mysmartservo.moveTo(0,-servoPos,delta);
  delay(sleepMs);
  printPosition(STATUS_UNKNOWN);
}

void drive() {
  char *arg;
  arg = command.next();
  xPos = atol(arg);
  arg = command.next();
  yPos = atol(arg);
  arg = command.next();
  zPos = atol(arg);

  int res = ramps.moveDelta(0, yPos, zPos, speed, bumperCount, distanceThreshold);
  printPosition(res);
}

void wait() {
  char *arg;
  arg = command.next();
  long msec = atol(arg);
  delay(msec);
  printPosition(STATUS_UNKNOWN);
}

void setSpeed() {
  char *arg;
  arg = command.next();
  speed = atoi(arg);
  printPosition(STATUS_UNKNOWN);
}

void setDistanceTh() {
  char *arg;
  arg = command.next();
  distanceThreshold = atoi(arg);
  printPosition(STATUS_UNKNOWN);
}

void setBumperCount() {
  char *arg;
  arg = command.next();
  bumperCount = atoi(arg);
  printPosition(STATUS_UNKNOWN);
}
