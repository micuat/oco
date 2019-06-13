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

void Ramps::moveTo(long targetX, long targetY, long targetZ, int _delay = 500)
{

    //stepOff van motoren
    motorX.stepOff();
    motorY.stepOff();
    motorZ.stepOff();

    long deltaX = targetX - motorX.position;
    long deltaY = targetY - motorY.position;
    long deltaZ = targetZ - motorZ.position;

    long dispX = 0;
    long dispY = 0;
    long dispZ = 0;

    if (deltaX < 0)
    {
        motorX.setDir(-1);
        deltaX *= -1;
    }
    else
    {
        motorX.setDir(1);
    }

    if (deltaY < 0)
    {
        motorY.setDir(-1);
        deltaY *= -1;
    }
    else
    {
        motorY.setDir(1);
    }

    if (deltaZ < 0)
    {
        motorZ.setDir(-1);
        deltaZ *= -1;
    }
    else
    {
        motorZ.setDir(1);
    }

    //als deltaX de grootste is gebruiken vergelijken we steeds met de X as
    //dat doen we ook voor de andere assen als zij groter zijn
    if(deltaX >= deltaY && deltaX >= deltaZ)
    {
        while(motorX.position != targetX)
        {
            //MotorX zal altijd stappen
            motorX.stepOn();
            dispX++;

            if(dispX * deltaY / deltaX > dispY)
            {
                //motor Y stapt
                motorY.stepOn();
                dispY++;
            }

            if(dispX * deltaZ / deltaX > dispZ)
            {
                //motor Z stapt
                motorZ.stepOn();
                dispZ++;
            }

            delayMicroseconds(_delay); //Wacht het aantal microseconden

            //stepOff van de motoren
            motorX.stepOff();
            motorY.stepOff();
            motorZ.stepOff();
        }
    }
    else if(deltaZ >= deltaX && deltaZ >= deltaY)
    {
        while(motorZ.position != targetZ)
        {
            //MotorZ zal altijd stappen
            motorZ.stepOn();
            dispZ++;

            if(dispZ * deltaX / deltaZ > motorX.position)
            {
                //motor X stapt
                motorX.stepOn();
                dispX++;
            }

            if(dispZ * deltaY / deltaZ > dispY)
            {
                //motor Y stapt
                motorY.stepOn();
                dispY++;
            }

            delayMicroseconds(_delay); //Wacht het aantal microseconden

            //stepOff van de motoren
            motorX.stepOff();
            motorY.stepOff();
            motorZ.stepOff();
        }
    }
    else if(deltaY >= deltaX && deltaY >= deltaZ)
    {
        while(motorY.position != targetY)
        {
            //MotorX zal altijd stappen
            motorY.stepOn();
            dispY++;

            if(dispY * deltaX / deltaY > dispX)
            {
                //motor X stapt
                motorX.stepOn();
                dispX++;
            }

            if(dispY * deltaZ / deltaY > dispZ)
            {
                //motor Z stapt
                motorZ.stepOn();
                dispZ++;
            }

            delayMicroseconds(_delay); //Wacht het aantal microseconden

            //stepOff van de motoren
            motorX.stepOff();
            motorY.stepOff();
            motorZ.stepOff();
        }
    }
}

void Ramps::moveDelta(long deltaX, long deltaY, long deltaZ, int _delay = 500)
{

    //stepOff van motoren
    motorY.stepOff();
    motorZ.stepOff();

    long dispY = 0;
    long dispZ = 0;

    if (deltaY < 0)
    {
        motorY.setDir(-1);
        deltaY *= -1;
    }
    else
    {
        motorY.setDir(1);
    }

    if (deltaZ < 0)
    {
        motorZ.setDir(-1);
        deltaZ *= -1;
    }
    else
    {
        motorZ.setDir(1);
    }

    if(deltaZ >= deltaY)
    {
        while(dispZ != deltaZ)
        {
            //MotorZ zal altijd stappen
            motorZ.stepOn(true);
            dispZ++;

            if(dispZ * deltaY / deltaZ > dispY)
            {
                //motor Y stapt
                motorY.stepOn(true);
                dispY++;
            }

            delayMicroseconds(_delay); //Wacht het aantal microseconden

            //stepOff van de motoren
            motorY.stepOff();
            motorZ.stepOff();
        }
    }
    else if(deltaY >= deltaZ)
    {
        while(dispY != deltaY)
        {
            //MotorX zal altijd stappen
            motorY.stepOn(true);
            dispY++;

            if(dispY * deltaZ / deltaY > dispZ)
            {
                //motor Z stapt
                motorZ.stepOn(true);
                dispZ++;
            }

            delayMicroseconds(_delay); //Wacht het aantal microseconden

            //stepOff van de motoren
            motorY.stepOff();
            motorZ.stepOff();
        }
    }
}