#include "PololuDriver.h"
#include "Ramps.h"
#include "SerialCommand.h"

#include <SoftwareSerial.h>
//#include "MeAuriga.h"

MeSmartServo mysmartservo(PORT5); // somehow goes to tx2/rx2 of mega

SerialCommand command;

int servoPos = 0;
int STATUS_UNKNOWN = 3;




/*
    Ramps.ccp - Library voor de Ramps shield
    Gemaakt door Brecht Ooms
*/

#include "Ramps.h"

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

int Ramps::moveTo(long targetX, long targetY, long targetZ, int _delay, bool ignoreBumper)
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
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < ULTRA_SENSOR_THRESHOLD)
          && ignoreBumper == false) { // BUMPER HIT
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

      if (errorY > deltaX)
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
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < ULTRA_SENSOR_THRESHOLD)
          && ignoreBumper == false) { // BUMPER HIT
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
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < ULTRA_SENSOR_THRESHOLD)
          && ignoreBumper == false) { // BUMPER HIT
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

int Ramps::moveDelta(long deltaX, long deltaY, long deltaZ, int _delay, bool ignoreBumper)
{

  //stepOff van motoren
  motorY.stepOff();
  motorZ.stepOff();

  long errorY = 0L;
  long errorZ = 0L;
  long dispY = 0L;
  long dispZ = 0L;

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
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < ULTRA_SENSOR_THRESHOLD)
          && ignoreBumper == false) { // BUMPER HIT
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
      if ((digitalRead(pin_bumper0) == LOW || ultraSensor.distanceCm() < ULTRA_SENSOR_THRESHOLD)
          && ignoreBumper == false) { // BUMPER HIT
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

int Ramps::driveTillHit(int _delay) {

  //stepOff van motoren
  motorY.stepOff();
  motorZ.stepOff();

  while (digitalRead(pin_bumper0) == HIGH && ultraSensor.distanceCm() >= ULTRA_SENSOR_THRESHOLD)
  {
    motorY.stepOn(true);
    motorZ.stepOn(true);

    delayMicroseconds(_delay); //Wacht het aantal microseconden

    //stepOff van de motoren
    motorY.stepOff();
    motorZ.stepOff();
  }
  return BUMPER_STOPPED;
}




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
  command.addCommand("moveToA", moveTo);
  command.addCommand("servo", rotServo);
  command.addCommand("clearX", clearX);
  command.addCommand("clearY", clearY);
  command.addCommand("clearZ", clearZ);
  command.addCommand("drive", drive);
  command.addCommand("driveTillHit", driveTillHit);
  command.addCommand("wait", wait);

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
void moveTo() {
  char *arg;
  arg = command.next();
  xPos = atol(arg);
  arg = command.next();
  yPos = atol(arg);
  arg = command.next();
  zPos = atol(arg);
  arg = command.next();
  int sp = atoi(arg);
  arg = command.next();
  bool ignoreBumper = atoi(arg) > 0;

  int res = ramps.moveTo(xPos, yPos, zPos, sp, ignoreBumper);
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
  arg = command.next();
  int sp = atoi(arg);
  arg = command.next();
  bool ignoreBumper = atoi(arg) > 0;

  int res = ramps.moveDelta(0, yPos, zPos, sp, ignoreBumper);
  printPosition(res);
}

void driveTillHit() {
  char *arg;
  arg = command.next();
  int sp = atoi(arg);
  int res = ramps.driveTillHit(sp);
  printPosition(res);
}

void wait() {
  char *arg;
  arg = command.next();
  long msec = atol(arg);
  delay(msec);
  printPosition(STATUS_UNKNOWN);
}
