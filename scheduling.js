'use strict';

var Scheduling = {};

// Count of 5 min time slots in a day.
var DAY_SLOTS_COUNT = 24 * 12;
var AVAILABLE_FOR_APPT = true;
var NOT_AVAILABLE_FOR_APPT = false;

// -------------------------------------------------------------------------------------------------\
// Private functions

/**
 * Returns an array of 5-min time slots that tells when appointments can be scheduled (slot has true value).
 *
 * All arrays have 288 boolean values that represent 5 minute scheduling slots for 24 hours (24 * 12 = 288).
 * Index 0 represent midnight, or time 00:00.
 * Boolean value is false for a time slot that is "busy" (i.e. not eligible
 * to schedule an appt) and 1 for a time slot that is "available".
 *
 * @param schedulableTimeSlots Time slots that are open for scheduling appointments.
 *   All cells are 0 except for where the appts can be scheduled (1).
 * @param busyTimeSlots Time slots that are busy and where appointments cannot be scheduled.
 *   All cells are 1 except for where appointments already exist (0).
 * @param startSlotModulo The modulo value that tells where an appointment can start at a specific 5 min time slot.
 *    1: can start every  5 minutes (:00, :05, :10...)
 *    2: can start every 10 minutes (:00, :10, :10...)
 *    3: can start every 15 minutes (:00, :15, :30...)
 *    4: can start every 20 minutes (:00, :20, :40)
 *    6: can start every 30 minutes (:00, :30)
 *   12: can start every 60 minutes (:00)
 * @param durationSlotCount How many 5-min time slots are needed for the appointment.
 *    1:  5-min appt
 *    2: 10-min appt
 *   ...
 *   12: 1-hr appt
 *   24: 2-hr appt
 *   ...
 */
Scheduling.getDayAvailabilityGrid = function(schedulableTimeSlots, busyTimeSlots, startSlotModulo, durationSlotCount) {
  validateGetAvailabilityGridArgs(availableTimeSlots, busyTimeSlots, startSlotModulo, durationSlotCount);
  var timeSlotsMerged = fillFiveMinTimeSlots(NOT_AVAILABLE_FOR_APPT);
  for (var i = 0; i < DAY_SLOTS_COUNT; i++) {
    if (schedulableTimeSlots[i] && busyTimeSlots[i]) {
      // open for appt and no appt already scheduled -- match!
      if (i % starSlotModulo == 0) {
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
  if (array.length != DAY_SLOTS_COUNT) {
    throw {
      name: "InvalidArraySize",
      message: "Array of 5-min times slots for scheduling must have " + DAY_SLOTS_COUNT
          + " cells. It has " + array.length + "."
    };
  }
}

/**
 * Returns an array where all the five min time slots for the day are filled with the specified value.
 * @param isAvailableForAppt True if the slot is available for an appointment, false otherwise.
 */
function fillFiveMinTimeSlots(isAvailableForAppt) {
  var array = new Array(DAY_SLOTS_COUNT);
  for (var i = 0; i < DAY_SLOTS_COUNT; i++) {
    array[i] = isAvailableForAppt;
  }
  return array;
}

exports.Scheduling = Scheduling;
