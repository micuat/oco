#include "PololuDriver.h"
#include "Ramps.h"
#include "SerialCommand.h"

#include <SoftwareSerial.h>
#include "MeAuriga.h"

MeSmartServo mysmartservo(PORT5); // somehow goes to tx2/rx2 of mega

SerialCommand command;

int servoPos = 0;

Ramps ramps = Ramps();

void printPosition() {
  Serial.print(ramps.motorX.position, DEC);
  Serial.print(" ");
  Serial.print(ramps.motorY.position, DEC);
  Serial.print(" ");
  Serial.print(ramps.motorZ.position, DEC);
  Serial.print(" ");
  Serial.print(servoPos, DEC);
  Serial.println("");
}

int pin_12v0 = 10;
int pin_12v1 = 9;

void setup()
{
  pinMode(pin_12v0, OUTPUT);
  pinMode(pin_12v1, OUTPUT);
  digitalWrite(pin_12v0, HIGH);
  digitalWrite(pin_12v1, HIGH);

  mysmartservo.begin(115200);
  delay(5);
  mysmartservo.assignDevIdRequest();
  delay(50);
  mysmartservo.moveTo(0,0,50);

  Serial.begin(250000);
  Serial.println("started...");
  
  command.addCommand("home", homeX);
  command.addCommand("moveToA", moveTo);
  command.addCommand("servo", rotServo);
  command.addCommand("clearX", clearX);
  command.addCommand("clearY", clearY);
  command.addCommand("clearZ", clearZ);
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
  printPosition();
}

void clearY() {
  ramps.motorY.position = 0;
  printPosition();
}

void clearZ() {
  ramps.motorZ.position = 0;
  printPosition();
}

void moveTo() {
  char *arg;
  arg = command.next();
  int xPos = atoi(arg);
  arg = command.next();
  int yPos = atoi(arg);
  arg = command.next();
  int zPos = atoi(arg);
  arg = command.next();
  int sp = atoi(arg);

//  Serial.print("debug: ");
//  Serial.print(xPos);
//  Serial.print(" ");
//  Serial.print(yPos);
//  Serial.print(" ");
//  Serial.print(zPos);
//  Serial.println();

  ramps.moveTo(xPos, yPos, zPos, sp);
  printPosition();
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
  printPosition();
}
