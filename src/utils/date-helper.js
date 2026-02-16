/**
 * Date utility functions
 */

/**
 * Check if date is today (UTC)
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
function isToday(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return d.getUTCFullYear() === today.getUTCFullYear() &&
         d.getUTCMonth() === today.getUTCMonth() &&
         d.getUTCDate() === today.getUTCDate();
}

/**
 * Get ISO week number
 * @param {Date|string} date - Date to get week number for
 * @returns {number} Week number (1-53)
 */
function getWeekNumber(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // January 1st of that year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start and end dates of a week
 * @param {number} weekNumber - ISO week number (1-53)
 * @param {number} year - Year
 * @returns {{ start: Date, end: Date }}
 */
function getWeekRange(weekNumber, year) {
  // January 4th is always in week 1 of ISO week-numbering year
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Day of week for Jan 4 (0 = Sunday, 1 = Monday, etc.)
  const jan4Day = jan4.getUTCDay() || 7;
  // Find Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  // Calculate Monday of target week
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);

  // Sunday is 6 days after Monday
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { start: monday, end: sunday };
}

/**
 * Get week identifier string (YYYY-WNN)
 * @param {Date|string} date - The date to get week ID for
 * @returns {string} Week identifier (e.g., "2024-W05")
 */
function getWeekId(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const year = d.getUTCFullYear();
  const weekNum = String(getWeekNumber(d)).padStart(2, '0');
  return `${year}-W${weekNum}`;
}

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 * @param {string} dateStr - Date string to parse
 * @returns {Date} Parsed date
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date|string} date - The date to find week start for
 * @returns {Date} Monday of that week
 */
function getWeekStart(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getUTCDay() || 7; // Convert Sunday (0) to 7
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

module.exports = { isToday, getWeekNumber, formatDate, getWeekRange, getWeekId, parseDate, getWeekStart };
