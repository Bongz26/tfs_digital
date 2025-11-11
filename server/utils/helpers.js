// server/utils/helpers.js
// Helper utility functions

/**
 * Format phone number to standard format (remove spaces, dashes, etc.)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // If starts with +27, keep it, otherwise ensure it starts with 0
  if (cleaned.startsWith('+27')) {
    return cleaned;
  } else if (cleaned.startsWith('27') && cleaned.length === 11) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return cleaned;
  } else if (cleaned.length === 9) {
    return `0${cleaned}`;
  }
  return cleaned;
};

/**
 * Format case number (THS-YYYY-XXX)
 */
const formatCaseNumber = (caseNumber) => {
  if (!caseNumber) return null;
  return caseNumber.toUpperCase().trim();
};

/**
 * Calculate days until funeral
 */
const daysUntilFuneral = (funeralDate) => {
  if (!funeralDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const funeral = new Date(funeralDate);
  funeral.setHours(0, 0, 0, 0);
  const diffTime = funeral - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Check if date is in the past
 */
const isPastDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if date is a Wednesday
 */
const isWednesday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date.getDay() === 3;
};

/**
 * Get next Wednesday from a given date (or today if no date provided)
 */
const getNextWednesday = (fromDate = new Date()) => {
  const date = new Date(fromDate);
  const dayOfWeek = date.getDay();
  const daysUntilWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilWednesday);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Generate tag ID for livestock (COW-XXX)
 */
const generateLivestockTag = async (query) => {
  const result = await query(
    `SELECT tag_id FROM livestock WHERE tag_id LIKE 'COW-%' ORDER BY tag_id DESC LIMIT 1`
  );
  
  if (result.rows.length === 0) {
    return 'COW-001';
  }
  
  const lastTag = result.rows[0].tag_id;
  const lastNumber = parseInt(lastTag.split('-')[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `COW-${nextNumber}`;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (!str) return null;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Format currency (ZAR)
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'R0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount);
};

/**
 * Format date for display
 */
const formatDate = (dateString, format = 'YYYY-MM-DD') => {
  if (!dateString) return null;
  const date = new Date(dateString);
  
  if (format === 'YYYY-MM-DD') {
    return date.toISOString().split('T')[0];
  } else if (format === 'DD/MM/YYYY') {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return date.toISOString();
};

module.exports = {
  formatPhoneNumber,
  formatCaseNumber,
  daysUntilFuneral,
  isPastDate,
  isWednesday,
  getNextWednesday,
  generateLivestockTag,
  sanitizeString,
  formatCurrency,
  formatDate
};

