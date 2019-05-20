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
  delay(500);
}

void loop()
{
  command.readSerial();
}

void homeX() {
  ramps.homeX(100);
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
