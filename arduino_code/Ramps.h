/*
    Ramps.h - Library voor de Ramps shield
    Gemaakt door Brecht Ooms
*/

#ifndef _Ramps_h
#define _Ramps_h

#include "MeAuriga.h"
#include <SoftwareSerial.h>
#include <Wire.h>

#if defined(ARDUINO) && ARDUINO >= 100
#include "arduino.h"
#else
#include "WProgram.h"
#endif

#include "PololuDriver.h"

#define X_STEP_PIN         54
#define X_DIR_PIN          55
#define X_ENABLE_PIN       38
#define X_MIN_PIN           3
#define X_MAX_PIN           2

#define Y_STEP_PIN         60
#define Y_DIR_PIN          61
#define Y_ENABLE_PIN       56
#define Y_MIN_PIN          14
#define Y_MAX_PIN          15

#define Z_STEP_PIN         46
#define Z_DIR_PIN          48
#define Z_ENABLE_PIN       62
#define Z_MIN_PIN          18
#define Z_MAX_PIN          19

#define E_STEP_PIN         26
#define E_DIR_PIN          28
#define E_ENABLE_PIN       24

#define Q_STEP_PIN         36
#define Q_DIR_PIN          34
#define Q_ENABLE_PIN       30

#define SDPOWER            -1
#define SDSS               53
#define LED_PIN            13

#define FAN_PIN            9

#define PS_ON_PIN          12
#define KILL_PIN           -1

#define HEATER_0_PIN       10	//PWM PIN!
#define HEATER_1_PIN       8	//PWM PIN!
#define TEMP_0_PIN         13	// Analoge numering
#define TEMP_1_PIN         14	// Analoge numering

const int ULTRA_SENSOR_PIN = 25;
MeUltrasonicSensor ultraSensor(ULTRA_SENSOR_PIN);

class Ramps
{
  public: //Public functies en variabelen
    const double ULTRA_SENSOR_THRESHOLD = 80;

    const int DONE_NORMALLY = 0;
    const int X_STOPPED = 1;
    const int BUMPER_STOPPED = 2;
    const int switch_threshold = 100;

    const long yScale = 1;

    int pin_bumper0;
    //Constructor
    Ramps();

    //Beweeg Motors X, Y en Z naar hun Home positie
    void home(int _delay);
    void homeX(int _delay);

    //LED aan (true) of LED uit (false)
    void led(bool On);

    //heater (0 of 1) aansturen met PWM (byte)
    void heater(int heaterNum, byte value);

    //Fan aan (true) of fan uit (false)
    void fan(bool On);

    //Beweeg naar gegeven positie met bresenhams lijn algoritme
    int moveTo(long targetX, long targetY, long targetZ, int _delay, int bumperCount, int distanceThreshold);

    int moveDelta(long deltaX, long deltaY, long deltaZ, int _delay, int bumperCount, int distanceThreshold);

    //int driveTillHit(int _delay);

    //declareren van motors
    PololuStepper motorX = PololuStepper(	X_STEP_PIN, X_DIR_PIN,
                                          X_ENABLE_PIN);
    PololuStepper motorY = PololuStepper(	Y_STEP_PIN, Y_DIR_PIN,
                                          Y_ENABLE_PIN);
    PololuStepper motorZ = PololuStepper(	Z_STEP_PIN, Z_DIR_PIN,
                                          Z_ENABLE_PIN);
    PololuStepper motorE = PololuStepper(	E_STEP_PIN, E_DIR_PIN,
                                          E_ENABLE_PIN);
    PololuStepper motorQ = PololuStepper(	Q_STEP_PIN, Q_DIR_PIN,
                                          Q_ENABLE_PIN);

  private: //Private functies en variabelen

};


//Constructor
Ramps::Ramps()
{
  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_0_PIN, OUTPUT);
  pinMode(HEATER_1_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(X_ENABLE_PIN, OUTPUT);
  pinMode(X_MIN_PIN, INPUT_PULLUP);
  pinMode(X_MAX_PIN, INPUT_PULLUP);

  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);
  pinMode(Y_ENABLE_PIN, OUTPUT);
  pinMode(Y_MIN_PIN, INPUT_PULLUP);
  pinMode(Y_MAX_PIN, INPUT_PULLUP);

  pinMode(Z_STEP_PIN, OUTPUT);
  pinMode(Z_DIR_PIN, OUTPUT);
  pinMode(Z_ENABLE_PIN, OUTPUT);
  pinMode(Z_MIN_PIN, INPUT_PULLUP);
  pinMode(Z_MAX_PIN, INPUT_PULLUP);

  pinMode(E_STEP_PIN, OUTPUT);
  pinMode(E_DIR_PIN, OUTPUT);
  pinMode(E_ENABLE_PIN, OUTPUT);

  pinMode(Q_STEP_PIN, OUTPUT);
  pinMode(Q_DIR_PIN, OUTPUT);
  pinMode(Q_ENABLE_PIN, OUTPUT);

  ultraSensor.setpin(ULTRA_SENSOR_PIN);
}

//LED aan (true) of LED uit (false)
void Ramps::led(bool On)
{
  if (On)
  {
    digitalWrite(LED_PIN, HIGH);
  }
  else
  {
    digitalWrite(LED_PIN, LOW);
  }
}


//heater (0 of 1) aansturen met PWM (byte)
void Ramps::heater(int heaterNum, byte value)
{
  if (heaterNum == 0)
  {
    analogWrite(HEATER_0_PIN, value);
  }
  else if (heaterNum == 1)
  {
    analogWrite(HEATER_1_PIN, value);
  }
}


//Fan aan (true) of fan uit (false)
void Ramps::fan(bool On)
{
  if (On)
  {
    digitalWrite(FAN_PIN, HIGH);
  }
  else
  {
    digitalWrite(FAN_PIN, LOW);
  }
}

//Beweeg Motors X, Y en Z naar hun Home positie
void Ramps::home(int _delay)
{
  bool allhome = false;

  //stepOff van motoren
  motorX.stepOff();
  motorY.stepOff();
  motorZ.stepOff();

  //Zet richtingen van motors
  motorX.setDir(-1);
  motorY.setDir(-1);
  motorZ.setDir(-1);

  do
  {
    allhome = true;

    //Test of de motor(s) al home zijn
    if (digitalRead(X_MIN_PIN))
    {
      motorX.stepOn();
      allhome = false;
    }
    if (digitalRead(Y_MIN_PIN))
    {
      motorY.stepOn();
      allhome = false;
    }
    if (digitalRead(Z_MIN_PIN))
    {
      motorZ.stepOn();
      allhome = false;
    }

    delayMicroseconds(_delay);

    motorX.stepOff();
    motorY.stepOff();
    motorZ.stepOff();

  } while (allhome == false);

  //Zet de richting al positief (om foute steprichting te voorkomen)
  motorX.setDir(1);
  motorY.setDir(1);
  motorZ.setDir(1);

  motorX.position = 0;
  motorY.position = 0;
  motorZ.position = 0;

}

void Ramps::homeX(int _delay)
{
  bool allhome = false;

  //stepOff van motoren
  motorX.stepOff();

  //Zet richtingen van motors
  motorX.setDir(-1);

  do
  {
    allhome = true;

    //Test of de motor(s) al home zijn
    if (digitalRead(X_MIN_PIN))
    {
      motorX.stepOn();
      allhome = false;
    }

    delayMicroseconds(_delay);

    motorX.stepOff();

  } while (allhome == false);

  //Zet de richting al positief (om foute steprichting te voorkomen)
  motorX.setDir(1);

  motorX.position = 0;
}

int Ramps::moveTo(long targetX, long targetY, long targetZ, int _delay, int bumperCount, int distanceThreshold)
{

  //stepOff van motoren
  motorX.stepOff();
  motorY.stepOff();
  motorZ.stepOff();

  long deltaX = targetX - motorX.position;
  long deltaY = targetY - motorY.position;
  long deltaZ = targetZ - motorZ.position;

  long dispX = 0L;
  long dispY = 0L;
  long dispZ = 0L;

  long errorX = 0L;
  long errorY = 0L;
  long errorZ = 0L;

  bool ignoreBumper = bumperCount <= 0;
  int bCount = 0;

  if (deltaX < 0L)
  {
    motorX.setDir(-1);
    deltaX *= -1L;
  }
  else
  {
    motorX.setDir(1);
  }

  if (deltaY < 0L)
  {
    motorY.setDir(-1);
    deltaY *= -1L;
  }
  else
  {
    motorY.setDir(1);
  }

  if (deltaZ < 0L)
  {
    motorZ.setDir(-1);
    deltaZ *= -1L;
  }
  else
  {
    motorZ.setDir(1);
  }

  //als deltaX de grootste is gebruiken vergelijken we steeds met de X as
  //dat doen we ook voor de andere assen als zij groter zijn
  if (deltaX >= deltaY && deltaX >= deltaZ)
  {
    while (motorX.position != targetX)
    {
      if (digitalRead(X_MIN_PIN) == LOW && motorX.position > switch_threshold) { // X HIT
        return X_STOPPED;
      }
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < distanceThreshold)
          && ignoreBumper == false) { // BUMPER HIT
        bCount++;
        if(bCount >= bumperCount)
          return BUMPER_STOPPED;
      }
      //MotorX zal altijd stappen
      motorX.stepOn();
      errorY += 2 * deltaY;
      errorZ += 2 * deltaZ;

      if (errorY > deltaX)
      {
        //motor Y stapt
        motorY.stepOn();
        errorY -= 2 * deltaX;
      }

      if (errorZ > deltaX)
      {
        //motor Z stapt
        motorZ.stepOn();
        errorZ -= 2 * deltaX;
      }

      delayMicroseconds(_delay); //Wacht het aantal microseconden

      //stepOff van de motoren
      motorX.stepOff();
      motorY.stepOff();
      motorZ.stepOff();
    }
  }
  else if (deltaZ >= deltaX && deltaZ >= deltaY)
  {
    while (motorZ.position != targetZ)
    {
      if (digitalRead(X_MIN_PIN) == LOW && motorX.position > switch_threshold) { // X HIT
        return X_STOPPED;
      }
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < distanceThreshold)
          && ignoreBumper == false) { // BUMPER HIT
        bCount++;
        if(bCount >= bumperCount)
          return BUMPER_STOPPED;
      }
      //MotorZ zal altijd stappen
      motorZ.stepOn();
      errorX += 2 * deltaX;
      errorY += 2 * deltaY;

      if (errorX > deltaZ)
      {
        //motor X stapt
        motorX.stepOn();
        errorX -= 2 * deltaZ;
      }

      if (errorY > deltaZ)
      {
        //motor Y stapt
        motorY.stepOn();
        errorY -= 2 * deltaZ;
      }

      delayMicroseconds(_delay); //Wacht het aantal microseconden

      //stepOff van de motoren
      motorX.stepOff();
      motorY.stepOff();
      motorZ.stepOff();
    }
  }
  else if (deltaY >= deltaX && deltaY >= deltaZ)
  {
    while (motorY.position != targetY)
    {
      if (digitalRead(X_MIN_PIN) == LOW && motorX.position > switch_threshold) { // X HIT
        return X_STOPPED;
      }
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < distanceThreshold)
          && ignoreBumper == false) { // BUMPER HIT
        bCount++;
        if(bCount >= bumperCount)
          return BUMPER_STOPPED;
      }
      //MotorX zal altijd stappen
      motorY.stepOn();
      errorX += 2 * deltaX;
      errorZ += 2 * deltaZ;

      if (errorX > deltaY)
      {
        //motor X stapt
        motorX.stepOn();
        errorX -= 2 * deltaY;
      }

      if (errorZ > deltaY)
      {
        //motor Z stapt
        motorZ.stepOn();
        errorZ -= 2 * deltaY;
      }

      delayMicroseconds(_delay); //Wacht het aantal microseconden

      //stepOff van de motoren
      motorX.stepOff();
      motorY.stepOff();
      motorZ.stepOff();
    }
  }
  return DONE_NORMALLY;
}

int Ramps::moveDelta(long deltaX, long deltaY, long deltaZ, int _delay, int bumperCount, int distanceThreshold)
{

  //stepOff van motoren
  motorY.stepOff();
  motorZ.stepOff();

  long errorY = 0L;
  long errorZ = 0L;
  long dispY = 0L;
  long dispZ = 0L;

  bool ignoreBumper = bumperCount <= 0;
  int bCount = 0;

  if (deltaY < 0L)
  {
    motorY.setDir(-1);
    deltaY *= -1L;
  }
  else
  {
    motorY.setDir(1);
  }

  if (deltaZ < 0L)
  {
    motorZ.setDir(-1);
    deltaZ *= -1L;
  }
  else
  {
    motorZ.setDir(1);
  }

  if (deltaZ >= deltaY)
  {
    while (dispZ != deltaZ)
    {
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < distanceThreshold)
          && ignoreBumper == false) { // BUMPER HIT
        bCount++;
        if(bCount >= bumperCount)
          return BUMPER_STOPPED;
      }
      //MotorZ zal altijd stappen
      motorZ.stepOn(true);
      dispZ++;
      errorY += 2 * deltaY;

      if (errorY > deltaZ)
      {
        //motor Y stapt
        motorY.stepOn(true);
        dispY++;
        errorY -= 2 * deltaZ;
      }

      delayMicroseconds(_delay); //Wacht het aantal microseconden

      //stepOff van de motoren
      motorY.stepOff();
      motorZ.stepOff();
    }
  }
  else if (deltaY >= deltaZ)
  {
    while (dispY != deltaY)
    {
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < distanceThreshold)
          && ignoreBumper == false) { // BUMPER HIT
        bCount++;
        if(bCount >= bumperCount)
          return BUMPER_STOPPED;
      }
      //MotorX zal altijd stappen
      motorY.stepOn(true);
      dispY++;
      errorZ += 2 * deltaZ;

      if (errorZ > deltaY)
      {
        //motor Z stapt
        motorZ.stepOn(true);
        dispZ++;
        errorZ -= 2 * deltaY;
      }

      delayMicroseconds(_delay); //Wacht het aantal microseconden

      //stepOff van de motoren
      motorY.stepOff();
      motorZ.stepOff();
    }
  }
  return DONE_NORMALLY;
}

//int Ramps::driveTillHit(int _delay) {
//
//  //stepOff van motoren
//  motorY.stepOff();
//  motorZ.stepOff();
//
//  while (digitalRead(pin_bumper0) == HIGH && ultraSensor.distanceCm() >= ULTRA_SENSOR_THRESHOLD)
//  {
//    motorY.stepOn(true);
//    motorZ.stepOn(true);
//
//    delayMicroseconds(_delay); //Wacht het aantal microseconden
//
//    //stepOff van de motoren
//    motorY.stepOff();
//    motorZ.stepOff();
//  }
//  return BUMPER_STOPPED;
//}

#endif
