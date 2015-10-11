var Scheduling = require('../scheduling.js').Scheduling;

var VALID_AVAILABILITY_GRID = new Array(288);
var INVALID_AVAILABILITY_GRID = new Array(10);
var VALID_TIME_SLOT_MODULO = 2;
var INVALID_TIME_SLOT_MODULO = 5;
var VALID_DURATION_SLOT_COUNT = 4;
var INVALID_DURATION_SLOT_COUNT = 0;

describe("Scheduling", function() {
  it("Invalid arguments", function() {
    expect(Scheduling.getDayAvailabilityGrid.bind(this,
        INVALID_AVAILABILITY_GRID, VALID_AVAILABILITY_GRID, VALID_TIME_SLOT_MODULO, VALID_DURATION_SLOT_COUNT))
        .toThrow();
    expect(Scheduling.getDayAvailabilityGrid.bind(this,
        VALID_AVAILABILITY_GRID, INVALID_AVAILABILITY_GRID, VALID_TIME_SLOT_MODULO, VALID_DURATION_SLOT_COUNT))
        .toThrow();
    expect(Scheduling.getDayAvailabilityGrid.bind(this,
        VALID_AVAILABILITY_GRID, VALID_AVAILABILITY_GRID, INVALID_TIME_SLOT_MODULO, VALID_DURATION_SLOT_COUNT))
        .toThrow();
    expect(Scheduling.getDayAvailabilityGrid.bind(this,
        VALID_AVAILABILITY_GRID, VALID_AVAILABILITY_GRID, VALID_TIME_SLOT_MODULO, INVALID_DURATION_SLOT_COUNT))
        .toThrow();
  });
});
