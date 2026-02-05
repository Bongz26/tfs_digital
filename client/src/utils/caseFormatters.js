/**
 * Case Data Formatters
 * Utilities for transforming case data between database and UI formats
 */

/**
 * Prepares case data from database for editing in HTML forms
 * Converts PostgreSQL timestamps and ISO dates to HTML input-compatible formats
 * 
 * @param {Object} caseData - Raw case data from database
 * @returns {Object} - Cleaned case data ready for form editing
 */
export function prepareCaseForEdit(caseData) {
    if (!caseData) return {};

    return {
        ...caseData,

        // Time fields: Extract HH:MM from PostgreSQL TIME format (HH:MM:SS+TZ)
        delivery_time: formatTimeForInput(caseData.delivery_time),
        funeral_time: formatTimeForInput(caseData.funeral_time),
        service_time: formatTimeForInput(caseData.service_time),
        church_time: formatTimeForInput(caseData.church_time),
        cleansing_time: formatTimeForInput(caseData.cleansing_time),

        // Date fields: Extract YYYY-MM-DD from ISO strings
        delivery_date: formatDateForInput(caseData.delivery_date),
        funeral_date: formatDateForInput(caseData.funeral_date),
        service_date: formatDateForInput(caseData.service_date),
        church_date: formatDateForInput(caseData.church_date),
        cleansing_date: formatDateForInput(caseData.cleansing_date),
        intake_day: formatDateForInput(caseData.intake_day),
        claim_date: formatDateForInput(caseData.claim_date),
    };
}

/**
 * Formats a time value for HTML <input type="time">
 * Converts "HH:MM:SS+TZ" or "HH:MM:SS.sssZ" to "HH:MM"
 * 
 * @param {string|null} time - Time from database
 * @returns {string} - Formatted time (HH:MM) or empty string
 */
export function formatTimeForInput(time) {
    if (!time) return '';

    // Handle various time formats:
    // - "10:30:00" -> "10:30"
    // - "10:30:00+02:00" -> "10:30"
    // - "10:30:00.000Z" -> "10:30"
    const timeStr = String(time);

    // Extract first 5 characters (HH:MM)
    return timeStr.slice(0, 5);
}

/**
 * Formats a date value for HTML <input type="date">
 * Converts ISO string to "YYYY-MM-DD"
 * 
 * @param {string|null} date - Date from database
 * @returns {string} - Formatted date (YYYY-MM-DD) or empty string
 */
export function formatDateForInput(date) {
    if (!date) return '';

    // Handle various date formats:
    // - "2026-01-31T22:00:00.000Z" -> "2026-01-31"
    // - "2026-01-31" -> "2026-01-31" (already correct)
    const dateStr = String(date);

    // Split on 'T' to remove time component, take first part
    return dateStr.split('T')[0];
}

/**
 * Formats time for display (read-only view)
 * 
 * @param {string|null} time - Time from database
 * @returns {string} - Formatted time for display
 */
export function formatTimeForDisplay(time) {
    if (!time) return 'Not set';
    return formatTimeForInput(time);
}

/**
 * Formats date for display (read-only view)
 * 
 * @param {string|null} date - Date from database
 * @returns {string} - Formatted date for display
 */
export function formatDateForDisplay(date) {
    if (!date) return 'Not set';

    try {
        return new Date(date).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return date.split('T')[0]; // Fallback to YYYY-MM-DD
    }
}

/**
 * Sanitizes driver data for display in dropdowns
 * Filters out invalid entries and ensures clean names
 * 
 * @param {Array} drivers - Array of driver objects from API
 * @returns {Array} - Cleaned driver array
 */
export function sanitizeDrivers(drivers) {
    if (!Array.isArray(drivers)) return [];

    return drivers
        .filter(d => d && d.id && d.name) // Remove null/invalid entries
        .map(d => ({
            ...d,
            name: String(d.name || 'Unknown Driver').trim()
        }))
        .filter(d => d.name && d.name !== 'null' && d.name !== 'undefined'); // Remove junk
}

/**
 * Sanitizes vehicle data for display in dropdowns
 * 
 * @param {Array} vehicles - Array of vehicle objects from API
 * @returns {Array} - Cleaned vehicle array
 */
export function sanitizeVehicles(vehicles) {
    if (!Array.isArray(vehicles)) return [];

    return vehicles
        .filter(v => v && v.id && v.reg_number)
        .map(v => ({
            ...v,
            reg_number: String(v.reg_number || 'Unknown').trim(),
            type: String(v.type || 'vehicle').toLowerCase().trim()
        }));
}
