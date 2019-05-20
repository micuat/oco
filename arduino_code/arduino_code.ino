#include "PololuDriver.h"
#include "Ramps.h"
#include "SerialCommand.h"

SerialCommand command;

Ramps ramps = Ramps();

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

  command.addCommand("G28", homeX);
  command.addCommand("G0", moveTo);
  command.addCommand("G1", moveToRelative);
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
