// server/utils/validators.js
// Validation utility functions

/**
 * Validate South African ID number format (13 digits)
 */
const validateSAId = (id) => {
  if (!id) return { valid: true, message: null }; // Optional field
  const idRegex = /^\d{13}$/;
  if (!idRegex.test(id)) {
    return { valid: false, message: 'ID number must be exactly 13 digits' };
  }
  return { valid: true, message: null };
};

/**
 * Validate South African phone number
 */
const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: 'Phone number is required' };
  // Remove spaces and common formatting
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Should start with 0 and be 10 digits, or start with +27 and be 12 digits
  const phoneRegex = /^(0\d{9}|\+27\d{9})$/;
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, message: 'Invalid phone number format' };
  }
  return { valid: true, message: null };
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email) return { valid: true, message: null }; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  return { valid: true, message: null };
};

/**
 * Validate date is a Wednesday
 */
const validateWednesday = (dateString) => {
  if (!dateString) return { valid: true, message: null }; // Optional field
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 3) {
    return { valid: false, message: 'Date must be a Wednesday' };
  }
  return { valid: true, message: null };
};

/**
 * Validate coordinates (latitude/longitude)
 */
const validateCoordinates = (lat, lng) => {
  if (lat === undefined || lng === undefined) {
    return { valid: true, message: null }; // Optional fields
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180' };
  }
  return { valid: true, message: null };
};

/**
 * Validate case data
 */
const validateCase = (caseData) => {
  const errors = [];

  // Required fields
  if (!caseData.deceased_name) {
    errors.push('Deceased name is required');
  }
  if (!caseData.nok_name) {
    errors.push('Next of kin name is required');
  }
  if (!caseData.nok_contact) {
    errors.push('Next of kin contact is required');
  }
  if (!caseData.funeral_date) {
    errors.push('Funeral date is required');
  }

  // Validate phone number
  const phoneValidation = validatePhone(caseData.nok_contact);
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.message);
  }

  // Validate ID number
  if (caseData.deceased_id) {
    const idValidation = validateSAId(caseData.deceased_id);
    if (!idValidation.valid) {
      errors.push(idValidation.message);
    }
  }

  // Validate intake day is Wednesday
  if (caseData.intake_day) {
    const wednesdayValidation = validateWednesday(caseData.intake_day);
    if (!wednesdayValidation.valid) {
      errors.push(wednesdayValidation.message);
    }
  }

  // Validate coordinates
  if (caseData.venue_lat !== undefined || caseData.venue_lng !== undefined) {
    const coordValidation = validateCoordinates(caseData.venue_lat, caseData.venue_lng);
    if (!coordValidation.valid) {
      errors.push(coordValidation.message);
    }
  }

  // Validate plan_category
  const validPlanCategories = ['motjha', 'single', 'family', 'colour_grade'];
  if (caseData.plan_category && !validPlanCategories.includes(caseData.plan_category)) {
    errors.push(`Plan category must be one of: ${validPlanCategories.join(', ')}`);
  }

  // Validate status
  const validStatuses = ['intake', 'confirmed', 'in_progress', 'completed'];
  if (caseData.status && !validStatuses.includes(caseData.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateSAId,
  validatePhone,
  validateEmail,
  validateWednesday,
  validateCoordinates,
  validateCase
};

