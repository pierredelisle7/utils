var Scheduling = require('../scheduling.js').Scheduling;

var VALID_AVAILABILITY_GRID = new Array(288);
var INVALID_AVAILABILITY_GRID = new Array(10);
var VALID_TIME_SLOT_MODULO = 2;
var INVALID_TIME_SLOT_MODULO = 5;
var VALID_DURATION_SLOT_COUNT = 4;
var INVALID_DURATION_SLOT_COUNT = 0;

var weekAvailableTimePeriods =
    [
      [],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      [["08:00", "12:00"], ["13:00", "17:00"]],
      []
    ];

var calendarAppts1 = [
  {
    date: new Date("2015-12-01 PST"),
    appts: [["08:00", "12:00"], ["13:00", "14:00"]]
  },
];

var calendarAppts2 = [
  {
    date: new Date("2015-12-01 PST"),
    appts: [["08:00", "12:00"], ["13:00", "14:00"]]
  },
  {
    date: new Date("2015-12-02 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  },
  {
    date: new Date("2015-12-03 PST"),
    appts: []
  },
  {
    date: new Date("2015-12-04 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  }

];


var calendarAppts3 = [
  {
    date: new Date("2015-12-01 PST"),
    appts: [["08:00", "12:00"], ["13:00", "14:00"]]
  },
  {
    date: new Date("2015-12-02 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  },
  {
    date: new Date("2015-12-03 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  }
];

describe("Scheduling", function () {

  describe("timeToSlot", function () {
    it("Valid arguments", function () {
      expect(Scheduling.timeToSlot("00:00")).toEqual(0);
      expect(Scheduling.timeToSlot("00:05")).toEqual(1);
      expect(Scheduling.timeToSlot("01:15")).toEqual(15);
      expect(Scheduling.timeToSlot("23:55")).toEqual(287);
    });
    it("Invalid arguments", function () {
      expect(Scheduling.timeToSlot.bind(this, "abc")).toThrow();
      expect(Scheduling.timeToSlot.bind(this, "31:00")).toThrow();
      expect(Scheduling.timeToSlot.bind(this, "15:43")).toThrow();
    });
  });

  describe("timeToSlot", function () {
    it("getEligibleApptTimes", function () {
      var eligibleApptTimes = Scheduling.getEligibleApptTimes(weekAvailableTimePeriods, calendarAppts1, [], 30, 60);
      console.log(eligibleApptTimes);
      expect(eligibleApptTimes.length).toEqual(4);
    });
  });

  /* FIXME: re-instate once we have the cloud function enabled.
   describe("getDayAvailabilityGrid", function () {
   it("Invalid arguments", function () {
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
   */
});

// timeToSlot("00:00");
