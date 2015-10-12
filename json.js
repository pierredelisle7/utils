'use strict';

var assert = require('assert');

var weekAvailableTimePeriodsObj =
    [
      [],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"], ["18:00", "20:00"]],
      [["08:00", "12:00"], ["13:00", "15:00"]],
      [["09:00", "13:00"]]
    ];

var weekAvailableTimePeriodsJson =
    '[' +
    '[],' +
    '[["08:00","12:00"],["13:00","17:00"]],' +
    '[["08:00","12:00"],["13:00","17:00"]],' +
    '[["08:00","12:00"],["13:00","17:00"]],' +
    '[["08:00","12:00"],["13:00","17:00"],["18:00","20:00"]],' +
    '[["08:00","12:00"],["13:00","15:00"]],' +
    '[["09:00","13:00"]]' +
    ']';


var toJson = JSON.stringify(weekAvailableTimePeriodsObj);
var toObj = JSON.parse(weekAvailableTimePeriodsJson);

console.log(weekAvailableTimePeriodsJson)
console.log(toJson);
assert.equal(weekAvailableTimePeriodsJson, toJson);

console.log(weekAvailableTimePeriodsObj)
console.log(toObj);


