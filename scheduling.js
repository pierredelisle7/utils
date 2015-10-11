'use strict';

var Scheduling = {};

// Count of 5 min time slots in a day.
var TIME_SLOTS_COUNT = 24 * 12;
// A true value in time slots means that the time slot is available to set an appointment.
var AVAILABLE_FOR_APPT = true;
// A false value in time slots means that the time slot is busy and *not* available to set an appointment.
var NOT_AVAILABLE_FOR_APPT = false;

// -------------------------------------------------------------------------------------------------\
// Data Structures

// validate json data:
// see http://codebeautify.org/jsonviewer

/**
 * ApptInfo defines information specific to an appointment to schedule. Properties are:
 *   - name
 *   - duration in minutes (must be a multiple of 5)
 *   - apptStartBoundary (see below)
 *   - weekAvailableTimePeriods If specified, overrides the weekAvailableTimePeriods defined globally
 *         for the provider.
 *
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
 * DayApptInfo defines all appointments for a specific date. It has the following properties:
 *   - date: the date of the appointments
 *   - appts: Array of TimePeriod objects that define busy times (i.e. not available for appointments).
 * For example:
 *   {
 *     date: 2015-12-05,
 *     appts: [["08:00","12:00"], ["13:00", "17:00"]]
 *   }
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
 * @param providerId Id of the provider.
 * @param clientId Id of the client.
 * @param apptInfo Information specific to the appointment to schedule. See
 * @param weekAvailableTimePeriods A WeekTimePeriods object that defines all periods of times during a week
 *     where appointments can be scheduled.
 * @param startDate Date (inclusive) where we start looking for eligible time slots to schedule the appointment.
 * @param endDate Date (inclusive) where we stop looking for eligible time slots to schedule the appointment.
 */
Scheduling.requestAppt = function (providerId, clientId, apptInfo, weekAvailableTimePeriods,
                                   startDate, endDate) {

}

// -------------------------------------------------------------------------------------------------\
// Private functions

/**
 * Returns an array of eligible appointment times.
 * Appointment times are formatted according to ISO 8601.
 *
 * @param weekAvailableTimePeriods A WeekTimePeriods object that defines all periods of times during a week
 *     where appointments can be scheduled.
 * @param calendarAppts Array of DayApptInfo objects.
 * @param apptStartBoundary The minutes at which an appointment can start (see ApptStartBoundary)
 * @param apptDuration Duration in minutes for the appointment.
 */
Scheduling.getEligibleApptTimes = function (weekAvailableTimePeriods, calendarAppts, apptStartBoundary, apptDuration) {
  var eligibleApptTimes = [];
  var weekAvailableTimeSlots = getWeekAvailableTimeSlots(weekAvailableTimePeriods);
  for (var i = 0; i < calendarAppts.length; i++) {
    var appts = calendarAppts[i].appts;
    var dayOfWeek = calendarAppts[i].date.getDay();
    var busyTimeSlots = timePeriodsToTimeSlots(appts, NOT_AVAILABLE_FOR_APPT);
    var mergedTimeSlots = mergeTimeConstraints(availabilityGrid[dayOfWeek], busyTimeSlots,
        startSlotModulo, durationSlotCount);
    for (var j = 0; j < mergedTimeSlots.length; j++) {
      if (mergedTimeSlots[j]) {
        eligibleApptTimes.push(createAvailabilityTime(calendarAppts[i].date, j));
      }
    }
  }
};

/**
 * Converts weekAvailableTimePeriods to weekAvailableTimeSlots.
 */
function getWeekAvailableTimeSlots(weekAvailableTimePeriods) {
  var weekAvailableTimeSlots = [];
  for (var i = 0; i < weekAvailableTimePeriods.length; i++) {
    weekAvailableTimeSlots.push(Scheduling.timePeriodsToTimeSlots(weekAvailableTimePeriods[i], true));
  }
  return weekAvailableTimeSlots;
}

/**
 * Helper function for availInfoToAvailGrid and busyInfoToAvailGrid.
 * @param timePeriods Array of TimePeriod objects that define available or busy times.
 * @param isAvailable Tells whether the timePeriods represent available (true)
 *     or busy (false) times.
 */
Scheduling.timePeriodsToTimeSlots = function (timePeriods, isAvailable) {
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
Scheduling.mergeTimeConstraints = function (schedulableTimeSlots, busyTimeSlots, apptStartBoundary, apptDuration) {
  var timeSlotsMerged = fillFiveMinTimeSlots(NOT_AVAILABLE_FOR_APPT);
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

exports.Scheduling = Scheduling;

var timeInfo = [
  {
    day: 1,
    start: "08:00",
    end: "12:00"
  },
  {
    day: 4,
    start: "13:00",
    end: "17:00"
  },
];
