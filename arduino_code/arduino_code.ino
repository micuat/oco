#include "PololuDriver.h"
#include "Ramps.h"
#include "SerialCommand.h"

#include <Servo.h>

SerialCommand command;

Ramps ramps = Ramps();

Servo servo;

void printPosition() {
  Serial.print(ramps.motorX.position);
  Serial.print(" ");
  Serial.print(ramps.motorY.position);
  Serial.print(" ");
  Serial.print(ramps.motorZ.position);
  Serial.println("");
}

void setup()
{
  Serial.begin(9600);
  Serial.println("started...");

  servo.attach(11);
  
  command.addCommand("home", homeX);
  command.addCommand("moveToA", moveTo);
  command.addCommand("moveToR", moveToRelative);
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

  ramps.moveTo(xPos, yPos, zPos, 30);
  printPosition();
}

void moveToRelative() {
  char *arg;
  arg = command.next();
  int xPos = atoi(arg);
  arg = command.next();
  int yPos = atoi(arg);
  arg = command.next();
  int zPos = atoi(arg);

  ramps.moveToRelative(xPos, yPos, zPos, 30);
  printPosition();
}


void rotServo() {
  char *arg;
  arg = command.next();
  int pos = min(max(0, atoi(arg)), 180);

  servo.write(pos);
}
