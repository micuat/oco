#include "PololuDriver.h"
#include "Ramps.h"

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
  ramps.homeX(100);
  delay(500);
  ramps.moveToRelative(-30000, 2700, 1000, 30);
  printPosition();
  delay(500);
  ramps.moveTo(0, 0, 0, 30);
  printPosition();
  delay(500);
  ramps.moveToRelative(1000, 30000, 2101, 30);
  printPosition();
  delay(500);
  ramps.moveToRelative(-17777, 1020, 3000, 30);
  printPosition();
  delay(500);
  ramps.moveTo(1000, 1020, 3050, 30);
  printPosition();
  delay(500);
}

void loop()
{
}
