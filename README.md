# temperature_controller
temperature controller using mqtt.

![Alt text](images/exam_wattx.png?raw=true "Title")


### Sample output
```sh
publishing 18 on channel:/readings/temperature
current temperature is :18
new loop in Controller with params: input temp:18 and target_temperature:23.5
temp_diff:5.5 from target:23.5
returning delta calculated:2.75
calculating valve settings using params: temp_delta:2.75 denominator:9.99999
{ level: 27.5000275000275 }
Boiler has received valve opening value of:27.5000275000275
current temp:18 and temp delta is:2.75
setting temp to:20.75
waited for 10000 and now returning set temperature:20.75
current temperature is :20.75
new loop in Controller with params: input temp:20.75 and target_temperature:23.5
temp_diff:2.75 from target:23.5
returning delta calculated:1.375
calculating valve settings using params: temp_delta:1.375 denominator:9.99999
{ level: 13.75001375001375 }
Boiler has received valve opening value of:13.75001375001375
current temp:20.75 and temp delta is:1.375
setting temp to:22.125
waited for 5000 and now returning set temperature:22.125
current temperature is :22.125
new loop in Controller with params: input temp:22.125 and target_temperature:23.5
temp_diff:1.375 from target:23.5
returning delta calculated:0.6875
calculating valve settings using params: temp_delta:0.6875 denominator:9.99999
{ level: 6.875006875006875 }
```

# Installation instructions
The software uses nodejs. Hence you would require nodejs version > v10.16.3. Current version used to test is: v10.16.3

### Steps:
    - git clone https://github.com/nilaysaha/temperature_controller.git
    - cd temperature_controller
    - npm install (uses package.json to install dependencies and create node_modules directory)
    - Run the code: node set_temp.js
    - Compare the output with the sample output.
        - once run it will stop because there is a waiting time for setting of temperature (sort of stabilization time when the boiler waits till the temperature stabilizes and this decreases as the difference in target and current temperature decreases.)
License
----
MIT