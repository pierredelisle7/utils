'use strict';

var Scheduling = {};

// Count of 5 min time slots in a day.
var TIME_SLOTS_COUNT = 24 * 12; // 288
// A true value in time slots means that the time slot is available to set an appointment.
var AVAILABLE_FOR_APPT = true;
// A false value in time slots means that the time slot is busy and *not* available to set an appointment.
var NOT_AVAILABLE_FOR_APPT = false;

// -------------------------------------------------------------------------------------------------\
// Data Structures

/**
 * TimePeriod is an array of two times (hh:mm) that delimit the start and end of a time period.
 * For example:
 *   ["08:00","14:00"]
 * defines a time period that starts at 8am and ends at 2pm.
 * Hours must be specified using the 24-hour time format (i.e from 00 to 23).
 * Minutes can only be specified in increments of 5 minutes (i.e. :05, :10, :15, ... :55).
 *
 * DayTimePeriods is an array of TimePeriods that are associated with the same day.
 * For example:
 *   [["08:00","14:00"], ["15:00", "19:00"]]
 *
 * WeekTimePeriods is an array of seven DayTimePeriods, one for each day of the week, starting
 * with Sunday. Index 0 is therefore Sunday, Monday is index 1, etc.
 * For example:
 * [
 *   [],
 *   [["08:00","12:00"], ["13:00", "17:00"]],
 *   [["08:00","12:00"], ["13:00", "17:00"]],
 *   [["08:00","12:00"], ["13:00", "17:00"]],
 *   [["08:00","12:00"], ["13:00", "17:00"]],
 *   [["08:00","12:00"], ["13:00", "17:00"]],
 *   []
 * ]
 *
 * WeekTimePeriods are specified in the SchedulingPreferences table. This specfies the time periods where a
 * provider is open to schedule appointments. Note that specific appointment types can override these
 * periods. FOr example, maybe a dentist will only schedule crowns on Tuesday/THursday.
 *
 * ApptInfo defines information specific to an appointment to schedule. Properties are:
 *   - name
 *   - duration in minutes (must be a multiple of 5)
 *   - apptStartBoundary (see below)
 *   - weekAvailableTimePeriods If specified, overrides the weekAvailableTimePeriods defined globally
 *         for the provider. See above.
 *
 * ApptInfo's are specified in the SchedulingApptType table. A provider can support as many
 * appointment types as needed.
 *
 * DayApptInfo defines all appointments for a specific date. It has the following properties:
 *   - date: the date of the appointments (a Date object, not a string).
 *   - appts: Array of TimePeriod objects that define busy times (i.e. not available for appointments).
 * For example:
 *   {
 *     date: 2015-12-05,
 *     appts: [["08:00","12:00"], ["13:00", "17:00"]]
 *   }
 *
 * This is the information we compute when we read a provider or client calendar.
 *
 * ApptStartBoundary defines the minutes boundary at which an appointment can start.
 * Possible values are:
 *    5: can start every  5 minutes (on :00, :05, :10..., :55)
 *   10: can start every 10 minutes (on :00, :10, :10..., :50)
 *   15: can start every 15 minutes (on :00, :15, :30, :45)
 *   20: can start every 20 minutes (on :00, :20, :40)
 *   30: can start every 30 minutes (on :00, :30)
 *   60: can start every 60 minutes (on :00)
 */

// -------------------------------------------------------------------------------------------------\
// Public API

/**
 * Returns an array of eligible appointment times.
 * Appointment times are formatted according to ISO 8601.
 *
 * For example:
 * [
 *   Mon Nov 30 2015 14:00:00 GMT-0800 (PST),
 *   Mon Nov 30 2015 14:30:00 GMT-0800 (PST),
 *   Mon Nov 30 2015 15:00:00 GMT-0800 (PST),
 * ]
 *
 * @param providerId Id of the provider.
 * @param clientId Id of the client.
 * @param apptInfo ApptInfo for the appointment to schedule.
 * @param weekAvailableTimePeriods WeekTimePeriods that defines all periods of times during a week
 *     where appointments can be scheduled.
 * @param startDate Date (inclusive) where we start looking for eligible time slots to schedule the appointment.
 * @param endDate Date (inclusive) where we stop looking for eligible time slots to schedule the appointment.
 */
Scheduling.requestAppt = function (providerId, clientId, apptInfo, weekAvailableTimePeriods,
                                   startDate, endDate) {
  validateRequestApptArgs();
}

// -------------------------------------------------------------------------------------------------\
// Private functions

/**
 * Returns an array of eligible appointment times.
 * Appointment times are formatted according to ISO 8601.
 *
 * @param weekAvailableTimePeriods WeekTimePeriods that defines all periods of times during a week
 *     where appointments can be scheduled.
 * @param providerCalendarAppts Array of DayApptInfo objects for the appts already set for the provider.
 *   The elements of the array are sorted in chronological order. There needs to be one entry for each of
 *   the days in the time period (startDate to endDate).
 * @param clientCalendarAppts Array of DayApptInfo objects for the appts already set for the client.
 *   The elements of the array are sorted in chronological order.
 * @param apptStartBoundary The minutes at which an appointment can start (see ApptStartBoundary)
 * @param apptDuration Duration in minutes for the appointment.
 */
Scheduling.getEligibleApptTimes = function (weekAvailableTimePeriods,
                                            providerCalendarAppts, clientCalendarAppts,
                                            apptStartBoundary, apptDuration) {
  var eligibleApptTimes = [];
  var weekAvailableTimeSlots = getWeekAvailableTimeSlots(weekAvailableTimePeriods);
  var calendarAppts = mergeCalendarAppts(providerCalendarAppts, clientCalendarAppts);
  for (var i = 0; i < calendarAppts.length; i++) {
    var appts = calendarAppts[i].appts;
    var dayOfWeek = calendarAppts[i].date.getDay();
    var busyTimeSlots = timePeriodsToTimeSlots(appts, NOT_AVAILABLE_FOR_APPT);
    var mergedTimeSlots = mergeTimeConstraints(weekAvailableTimeSlots[dayOfWeek], busyTimeSlots,
        apptStartBoundary, apptDuration);
    for (var j = 0; j < mergedTimeSlots.length; j++) {
      if (mergedTimeSlots[j]) {
        eligibleApptTimes.push(createAvailabilityTime(calendarAppts[i].date, j));
      }
    }
  }
  return eligibleApptTimes;
};

/**
 * Merge appointments of two calendars.
 *
 * Both calendarAppts are DayApptInfo objects.
 * FIXME: Could do better here -- really merge the time periods...
 */
function mergeCalendarAppts(calendarAppts1, calendarAppts2) {
  if (!calendarAppts1 || calendarAppts1.length == 0) {
    return calendarAppts2;
  }
  if (!calendarAppts2 || calendarAppts2.length == 0) {
    return calendarAppts1;
  }

  var calendarAppts = [];
  var i = 0;
  var j = 0;
  var dayAppts1 = calendarAppts1[i];
  var dayAppts2 = calendarAppts2[j];
  while ((i < calendarAppts1.length) && (j < calendarAppts2.length)) {
    if (dayAppts1.date < dayAppts2.date) {
      calendarAppts.push(dayAppts1);
      dayAppts1 = calendarAppts1[++i];
    } else if (dayAppts2.date < dayAppts1.date) {
      calendarAppts.push(dayAppts2);
      dayAppts2 = calendarAppts2[++j];
    } else {
      dayAppts1.appts.push.apply(dayAppts1.appts, dayAppts2.appts);
      calendarAppts.push(dayAppts1);
      dayAppts1 = calendarAppts1[++i];
      dayAppts2 = calendarAppts2[++j];
    }
  }
  while (i < calendarAppts1.length) {
    calendarAppts.push(calendarAppts1[i++]);
  }
  while (j < calendarAppts2.length) {
    calendarAppts.push(calendarAppts2[j++]);
  }
  return calendarAppts;
}

/**
 * Converts weekAvailableTimePeriods to weekAvailableTimeSlots.
 */
function getWeekAvailableTimeSlots(weekAvailableTimePeriods) {
  var weekAvailableTimeSlots = [];
  for (var i = 0; i < weekAvailableTimePeriods.length; i++) {
    weekAvailableTimeSlots.push(timePeriodsToTimeSlots(weekAvailableTimePeriods[i], true));
  }
  return weekAvailableTimeSlots;
}

/**
 * Helper function for availInfoToAvailGrid and busyInfoToAvailGrid.
 * @param timePeriods Array of TimePeriod objects that define available or busy times.
 * @param isAvailable Tells whether the timePeriods represent available (true)
 *     or busy (false) times.
 */
function timePeriodsToTimeSlots(timePeriods, isAvailable) {
  var initialTimeSlotValue = isAvailable ? NOT_AVAILABLE_FOR_APPT : AVAILABLE_FOR_APPT;
  var availGrid = genFiveMinTimeSlots(initialTimeSlotValue);
  var timeSlotValue = isAvailable ? AVAILABLE_FOR_APPT : NOT_AVAILABLE_FOR_APPT;
  for (var i = 0; i < timePeriods.length; i++) {
    var timePeriod = timePeriods[i];
    var startSlot = Scheduling.timeToSlot(timePeriod[0]);
    var endSlot = Scheduling.timeToSlot(timePeriod[1]);
    for (var j = startSlot; j < endSlot; j++) {
      availGrid[j] = timeSlotValue;
    }
  }
  return availGrid;
}

/**
 * Returns the time slot index associated with a time value.
 * Time slot indices run from 0 (00:00) to 287 (23:55).
 * @param time Time value specified using format hh:mm.
 *     Minutes can only be multiple of 5 minutes.
 */
Scheduling.timeToSlot = function (time) {
  var timeInfo = time.match(/([0-2][0-9]):([0-5][05])/);
  if (timeInfo == null) {
    throw {
      name: "InvalidTime",
      message: time
    };
  }
  var result = (timeInfo[1] * 12) + (timeInfo[2] / 5);
  return result;
};

/**
 * Returns an array of 5-min time slots that tells when appointments can be scheduled (slot has true value).
 *
 * @param schedulableTimeSlots Time slots that are open for scheduling appointments.
 *   All cells are 0 except for where the appts can be scheduled (1).
 * @param busyTimeSlots Time slots that are busy and where appointments cannot be scheduled.
 *   All cells are 1 except for where appointments already exist (0).
 * @param apptStartBoundary
 * @param apptDuration
 */
function mergeTimeConstraints(schedulableTimeSlots, busyTimeSlots, apptStartBoundary, apptDuration) {
  var timeSlotsMerged = genFiveMinTimeSlots(NOT_AVAILABLE_FOR_APPT);
  var startModuloValue = apptStartBoundary / 5;
  var durationSlotCount = apptDuration / 5;
  for (var i = 0; i < TIME_SLOTS_COUNT; i++) {
    if (schedulableTimeSlots[i] && busyTimeSlots[i]) {
      // open for appt and no appt already scheduled -- match!
      if (i % startModuloValue == 0) {
        // Time slot is at proper boundary.
        var allSlotsAvailable = true;
        for (var j = 0; j < durationSlotCount; j++) {
          var slotIndex = i + j;
          if (!(schedulableTimeSlots[slotIndex] && busyTimeSlots[slotIndex])) {
            // Not enough contiguous time slots for the full appointment duration. Not a match.
            allSlotsAvailable = false;
            break;
          }
        }
        if (allSlotsAvailable) {
          timeSlotsMerged[i] = AVAILABLE_FOR_APPT;
        }
      } else {
        // Does not start at appt time boundary.
      }
    } else {
      // Cannot schedule (not open for appt, or already busy.
    }
  }
  return timeSlotsMerged;
};

// FIXME: re-instate this once we have the cloud function enabled.
function validateGetAvailabilityGridArgs(availableTimeSlots, busyTimeSlots, startSlotModulo, durationSlotCount) {
  validateArraySize(availableTimeSlots);
  validateArraySize(busyTimeSlots);
  if ([1, 2, 3, 4, 6, 12].indexOf(startSlotModulo) < 0) {
    throw "startSlotModulo must be one of the following values: 1, 2, 3, 4, 6, 12. It is " + startSlotModulo + ".";
  }
  if (durationSlotCount <= 0) {
    throw "Invalid durationSlotCount: " + durationSlotCount;
  }
}

function validateArraySize(array) {
  if (array.length != TIME_SLOTS_COUNT) {
    throw {
      name: "InvalidArraySize",
      message: "Array of 5-min times slots for scheduling must have " + TIME_SLOTS_COUNT
      + " cells. It has " + array.length + "."
    };
  }
}

/**
 * Returns an AvailGrid where all the five min time slots for the day are filled with the specified value.
 * @param isAvailableForAppt True if the slot is available for an appointment, false otherwise.
 */
function genFiveMinTimeSlots(isAvailableForAppt) {
  var array = new Array(TIME_SLOTS_COUNT);
  for (var i = 0; i < TIME_SLOTS_COUNT; i++) {
    array[i] = isAvailableForAppt;
  }
  return array;
}

function createAvailabilityTime(date, j) {
  var availabilityTime = new Date(date);
  var hours = Math.floor(j / 12);
  var minutes = (j % 12) * 5;
  availabilityTime.setHours(hours)
  availabilityTime.setMinutes(minutes);
  return availabilityTime;
}

/**
 * Returns an array of DayApptInfo objects.
 */
function parseCronofyData(cronofyJson) {
  var dayApptInfoArray = [];
  //var events = JSON.parse(cronofyJson).events;
  var events = cronofyJson.events;
  var currentDay = null;
  for (var i = 0; i < events.length; i++) {
    var start = new Date(events[i].start);
    var end = new Date(events[i].end);
    var appt = [start.getHours() + ":" + start.getMinutes(),
      end.getHours() + ":" + end.getMinutes()];
    if (currentDay != null && currentDay.date.isSameDateAs(start)) {
       currentDay.appts.push(appt);
    } else {
      if (currentDay != null) {
        dayApptInfoArray.push(currentDay);
      }
      currentDay = {
        date: start,
        appts: [appt]
      }
    }
  }
  if (currentDay != null) {
    dayApptInfoArray.push(currentDay);
  }
  return dayApptInfoArray;
}

Date.prototype.isSameDateAs = function(other) {
  return (
      this.getFullYear() === other.getFullYear() &&
      this.getMonth() === other.getMonth() &&
      this.getDate() === other.getDate()
  );
}

exports.Scheduling = Scheduling;

var cronofyJson = {
  "pages":{"current":1,"total":1},
  "events":[{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_561ac3dce7d68f801b6d9e15","summary":"test appt busy","description":"","start":"2015-10-12T20:00:00Z","end":"2015-10-12T21:00:00Z","deleted":false,"created":"2015-10-11T20:17:24Z","updated":"2015-10-11T20:17:32Z","participation_status":"accepted","attendees":[],"transparency":"opaque","status":"confirmed","categories":[]},{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_55eb0c08e7d68f801b59b2bd","summary":"all team","description":"","start":"2015-10-13T02:30:00Z","end":"2015-10-13T03:30:00Z","deleted":false,"created":"2015-07-29T23:37:16Z","updated":"2015-08-04T20:47:08Z","participation_status":"needs_action","attendees":[{"email":"pierre.swimconnection@gmail.com","display_name":"Pierre Delisle","status":"needs_action"},{"email":"joe@fuelwell.com","display_name":"Joe Tischler","status":"accepted"},{"email":"donny@wellapp.com","display_name":"donny@fuelwell.com","status":"accepted"},{"email":"gui@fuelwell.com","display_name":"Guillaume de Zwirek","status":"accepted"}],"transparency":"opaque","status":"confirmed","categories":[]},{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_561ac3e3e7d68f801b6d9e1c","summary":"test appt busy 2","description":"","start":"2015-10-13T21:00:00Z","end":"2015-10-13T22:00:00Z","deleted":false,"created":"2015-10-11T20:17:34Z","updated":"2015-10-11T20:17:39Z","participation_status":"accepted","attendees":[],"transparency":"opaque","status":"confirmed","categories":[]},{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_561ac3eee7d68f801b6d9e1d","summary":"test appt busy 3","description":"","start":"2015-10-14T22:00:00Z","end":"2015-10-14T23:00:00Z","deleted":false,"created":"2015-10-11T20:17:43Z","updated":"2015-10-11T20:17:50Z","participation_status":"accepted","attendees":[],"transparency":"opaque","status":"confirmed","categories":[]},{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_55eb0c08e7d68f801b59b2be","summary":"Fete de Vincent","description":"","start":"2015-10-15","end":"2015-10-16","deleted":false,"created":"2006-09-28T19:28:21Z","updated":"2015-07-07T01:55:22Z","participation_status":"accepted","attendees":[],"transparency":"opaque","status":"confirmed","categories":[]},{"calendar_id":"cal_VesMAFStrG1xAHiE_IqTwe6Cl0QNWofE0u95TYg","event_uid":"evt_external_55eb0c09e7d68f801b59b2bf","summary":"Fete de Lina","description":"","start":"2015-10-15","end":"2015-10-16","deleted":false,"created":"2006-09-28T19:28:48Z","updated":"2015-07-07T01:55:22Z","participation_status":"accepted","attendees":[],"transparency":"opaque","status":"confirmed","categories":[]}]
};

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
  {
    date: new Date("2015-12-02 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  },
  {
    date: new Date("2015-12-04 PST"),
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  }

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
    appts: [["08:00", "09:00"], ["13:00", "17:00"]]
  }
];

/*
 console.log(createAvailabilityTime(new Date("2015-12-01 PDT"), 96));
 console.log(createAvailabilityTime(new Date("2015-12-01 PST"), 97));
 console.log(createAvailabilityTime(new Date("2015-12-01 PST"), 98));
 console.log(createAvailabilityTime(new Date("2015-12-01 PST"), 99));
 */

//console.log(Scheduling.getEligibleApptTimes(weekAvailableTimePeriods, calendarAppts1, calendarAppts2, 30, 30));

//console.dir(mergeCalendarAppts(calendarAppts1, calendarAppts2), {depth: null});
//console.dir(mergeCalendarAppts(calendarAppts1, []), {depth: null});

console.dir(parseCronofyData(cronofyJson), {depth: null});
