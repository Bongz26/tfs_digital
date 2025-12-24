// Utility functions for checking vehicle time conflicts

/**
 * Check if two time ranges overlap
 * @param {Date} start1 - Start time of first event
 * @param {Date} end1 - End time of first event
 * @param {Date} start2 - Start time of second event
 * @param {Date} end2 - End time of second event
 * @returns {boolean} - True if times overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return (start1 < end2 && end1 > start2);
}

/**
 * Check if a vehicle has a time conflict for a given case
 * @param {Object} vehicleAssignments - Array of roster assignments for the vehicle
 * @param {string} funeralDate - Date of the case (YYYY-MM-DD)
 * @param {string} funeralTime - Time of the case (HH:MM:SS or HH:MM)
 * @param {number} bufferHours - Buffer time in hours (default: 2)
 * @param {number} excludeCaseId - Case ID to exclude from conflict check
 * @returns {Object|null} - Conflict details or null if no conflict
 */
function checkVehicleConflict(vehicleAssignments, funeralDate, funeralTime, bufferHours = 1.5, excludeCaseId = null) {
  if (!funeralDate) {
    return null; // Can't check conflicts without a date
  }

  // Filter assignments for the same date and exclude the current case
  const sameDayAssignments = vehicleAssignments.filter(assignment => {
    if (excludeCaseId && assignment.case_id === excludeCaseId) {
      return false;
    }
    return assignment.funeral_date === funeralDate && assignment.status !== 'completed';
  });

  if (sameDayAssignments.length === 0) {
    return null; // No assignments on the same day
  }

  if (!funeralTime) {
    // If current case has no time, check if any assignment has a time
    const hasTimedAssignment = sameDayAssignments.some(a => a.funeral_time);
    if (hasTimedAssignment) {
      return {
        hasConflict: true,
        reason: 'Case has no funeral time set, but vehicle is assigned to timed cases on the same day',
        conflicts: sameDayAssignments.filter(a => a.funeral_time)
      };
    }
    return null; // No timed assignments, allow it
  }

  // Parse current case time
  const currentTime = new Date(`${funeralDate}T${funeralTime}`);
  const currentEndTime = new Date(currentTime.getTime() + (bufferHours * 60 * 60 * 1000));

  // Check each assignment for time overlap
  for (const assignment of sameDayAssignments) {
    if (!assignment.funeral_time) {
      // Assignment has no time - assume potential conflict
      return {
        hasConflict: true,
        reason: `Vehicle assigned to ${assignment.case_number || 'another case'} on the same day without a specific time`,
        conflict: assignment
      };
    }

    const assignmentTime = new Date(`${assignment.funeral_date}T${assignment.funeral_time}`);
    const assignmentEndTime = new Date(assignmentTime.getTime() + (bufferHours * 60 * 60 * 1000));

    if (timesOverlap(currentTime, currentEndTime, assignmentTime, assignmentEndTime)) {
      return {
        hasConflict: true,
        reason: `Time conflict with ${assignment.case_number || 'another case'} at ${assignment.funeral_time}`,
        conflict: assignment
      };
    }
  }

  return null; // No conflicts found
}

/**
 * Get available vehicles for a case (excluding those with time conflicts)
 * @param {Array} allVehicles - All vehicles
 * @param {Array} vehicleAssignments - All roster assignments with case details
 * @param {string} funeralDate - Date of the case
 * @param {string} funeralTime - Time of the case
 * @param {number} caseId - ID of the case (to exclude from conflict check)
 * @returns {Array} - Available vehicles
 */
function getAvailableVehicles(allVehicles, vehicleAssignments, funeralDate, funeralTime, caseId = null) {
  if (!funeralDate) {
    // If no date, return all vehicles (can't check conflicts)
    return allVehicles;
  }

  // Group assignments by vehicle_id
  const assignmentsByVehicle = {};
  vehicleAssignments.forEach(assignment => {
    if (!assignmentsByVehicle[assignment.vehicle_id]) {
      assignmentsByVehicle[assignment.vehicle_id] = [];
    }
    assignmentsByVehicle[assignment.vehicle_id].push(assignment);
  });

  // Filter vehicles that don't have conflicts
  return allVehicles.filter(vehicle => {
    const assignments = assignmentsByVehicle[vehicle.id] || [];
    const conflict = checkVehicleConflict(assignments, funeralDate, funeralTime, 1.5, caseId);
    return !conflict || !conflict.hasConflict;
  });
}

module.exports = {
  checkVehicleConflict,
  getAvailableVehicles,
  timesOverlap
};

