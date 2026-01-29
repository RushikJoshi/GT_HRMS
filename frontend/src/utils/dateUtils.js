/**
 * Formats a given date string or Date object to 'DD-MM-YYYY' format.
 * @param {string|Date} date - The date to format.
 * @returns {string} - Date formatted as 'DD-MM-YYYY'.
 */
export const formatDateDDMMYYYY = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Formats a given date string or Date object to 'DD-MM-YYYY HH:mm' format.
 * @param {string|Date} date - The date to format.
 * @returns {string} - Date formatted as 'DD-MM-YYYY HH:mm'.
 */
export const formatDateTimeDDMMYYYY = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
};
