#!/bin/node

const mqtt = require('mqtt')
const broker = 'mqtt://test.mosquitto.org';  
const client = mqtt.connect(broker);


/*MQTT CHANNELS or TOPICS*/
CT_CHANNEL='/readings/temperature'
TS_CHANNEL='/actuators/room-1'

const publish_CT = (current_temp) => {
   var packet = {
       "sensorID": "sensor-1",
       "type": "measurement",
       "value": current_temp.toString()
   }
    client.publish(CT_CHANNEL, JSON.stringify(packet))
}


const mqtt_handler = (set_temp = ROOM_TEMPERATURE) => {
    a = new Controller(set_temp)
    b = new Boiler(INIT_SETTING_TEMP_SENSOR)

    client.on('connect', function () {
	client.subscribe(CT_CHANNEL)
	client.subscribe(TS_CHANNEL)
	
	//trigger feedback loop
	console.log(`publishing ${INIT_SETTING_TEMP_SENSOR} on channel:${CT_CHANNEL}`)
	publish_CT(INIT_SETTING_TEMP_SENSOR)
    })

    client.on('message', async (topic, message) => {

	if (topic == CT_CHANNEL){
	    const c_temp = JSON.parse(message)
	    console.log(`current temperature is :${c_temp.value}`);  
	    const new_valve_settings = a.main(c_temp.value)
	    client.publish(TS_CHANNEL, JSON.stringify(new_valve_settings))
	}

	/*this piece is EXTRA CODE in order to set in a feedback loop from boiler heating the room*/
	if (topic == TS_CHANNEL){
	    var valve_settings = JSON.parse(message)
	    console.log(valve_settings)
	    console.log(`Boiler has received valve opening value of:${valve_settings.level}`)
	    var new_temp = await b.main(valve_settings.level)
	    publish_CT(new_temp)
	}
	
    })
} 

ROOM_TEMPERATURE=23.5
UPPER_TEMP_DIFF_LIMIT=10 //we will fully open value for temp diff(target - current > 10)
LOWER_TEMP_DIFF_LIMIT=0.00001


class Controller{
    constructor(target_temperature = ROOM_TEMPERATURE){
	this.last_set_temperature = INIT_SETTING_TEMP_SENSOR
	this.target_temperature = target_temperature
    }

    /*Here we set valve open level:100 corresponds to temp_diff=10 or more and 0 corresponds to temp_diff < TEMP_STABILITY_DIFF*/
    get_valve_open_level(temp_delta){
	let valve_open_level = 0
	if (temp_delta > UPPER_TEMP_DIFF_LIMIT) {
	    valve_open_level = 100
	}
	else
	{
	    var denominator = UPPER_TEMP_DIFF_LIMIT - LOWER_TEMP_DIFF_LIMIT
	    console.log(`calculating valve settings using params: temp_delta:${temp_delta} denominator:${denominator}`)
	    valve_open_level =  temp_delta*(100)/denominator
	}
	return valve_open_level
    }


    /* 
       calculate the new delta. -1 for
       temperature overshoot on high side
    */
    calc_temp_setting(input_temp){
	let temp_diff = this.target_temperature - input_temp
	let temp_delta = temp_diff/2
	
	console.log(`temp_diff:${temp_diff} from target:${this.target_temperature}`)
	
	if (temp_delta > 0) {
	    this.last_set_temperature = input_temp + temp_delta 
	}
	
	console.log(`returning delta calculated:${temp_delta}`)
	return temp_delta
    }

    main(input_temp) {
	console.log(`new loop in Controller with params: input temp:${input_temp} and target_temperature:${this.target_temperature}`)
	let temp_delta = this.calc_temp_setting(input_temp)
	let valve_open_level = this.get_valve_open_level(temp_delta)
	return {
	    'level': valve_open_level
	}	
    }
    
}


/*Boiler params*/
BOILER_ON_STATE=1
BOILER_OFF_STATE=0

BOILER_VALVE_MAX_LEVEL=100
BOILER_VALVE_MIN_LEVEL=0

TEMP_STABILITY_TIME=20000 //10s. Ideally a variable but we take as constant.
INIT_SETTING_TEMP_SENSOR = 18

TEMP_STABILITY_DIFF=0.0001 /*when diff between target and actual temp is lower than this value, switch off the boiler or close the valve.*/

/*This represents the boiler and it receives instructions via valve opening level*/
class Boiler{
    constructor(init_temp = INIT_SETTING_TEMP_SENSOR){
	this.temp_reading = init_temp
	this.boiler_state = BOILER_ON_STATE	
    }
    
    sleep(milliseconds) {
	const date = Date.now();
	let currentDate = null;
	do {
	    currentDate = Date.now();
	} while (currentDate - date < milliseconds);
    }

    _calc_settle_time(temp_delta){
	return TEMP_STABILITY_TIME*temp_delta/Math.abs(ROOM_TEMPERATURE-INIT_SETTING_TEMP_SENSOR)
    }

      
    _regulate_temperature(temp_delta) {
	console.log(`current temp:${this.temp_reading} and temp delta is:${temp_delta}`)
	if (temp_delta > TEMP_STABILITY_DIFF) {
	    this.boiler_state = BOILER_ON_STATE
	    this.temp_reading += temp_delta
	}
	else
	{
	    this.boiler_state = BOILER_OFF_STATE
	    console.log(`temperature diff:${temp_delta} is less than min tolerance:${TEMP_STABILITY_DIFF}`)
	    console.log(`switching off boiler`)
	}
	
	console.log(`setting temp to:${this.temp_reading}`)
	var sleep_time=this._calc_settle_time(temp_delta)
	this.sleep(sleep_time)
	console.log(`waited for ${sleep_time} and now returning set temperature:${this.temp_reading} `)
	return this.temp_reading
    }

    main(valve_open_level) {
	let t_delta = 0
	if (valve_open_level == 100) {
	    t_delta = UPPER_TEMP_DIFF_LIMIT
	}
	else
	{
	    t_delta = (UPPER_TEMP_DIFF_LIMIT - LOWER_TEMP_DIFF_LIMIT)*valve_open_level/100 
	}	
	
	if (t_delta < TEMP_STABILITY_DIFF) {
	    console.log('reached stable temperature. Quitting')
	    process.exit(1)
	}
	return this._regulate_temperature(t_delta)
    }
    
}



if (require.main === module){
    mqtt_handler()
}
