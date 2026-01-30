import { Timestamp } from 'firebase/firestore';

/**
 * Type for Firestore timestamp values that can be converted to Date
 */
type FirestoreTimestamp = Timestamp | { toDate: () => Date } | Date | string | number | null | undefined;

/**
 * Safely convert a Firestore Timestamp or date-like value to a JavaScript Date
 * @param timestamp - Firestore Timestamp, Date, string, number, or null/undefined (accepts unknown for flexibility)
 * @returns Date object or null if conversion fails
 */
export const toDate = (timestamp: FirestoreTimestamp | unknown): Date | null => {
  if (!timestamp) return null;
  
  // Already a Date
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? null : timestamp;
  }
  
  // Firestore Timestamp with toDate method
  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof (timestamp as { toDate: unknown }).toDate === 'function') {
    try {
      const date = (timestamp as { toDate: () => Date }).toDate();
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  // String or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
};

/**
 * Format a Firestore timestamp to a localized date string
 * @param timestamp - Firestore Timestamp or date-like value (accepts unknown for flexibility)
 * @param locale - Locale string (default: 'en-GB')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or 'N/A' if conversion fails
 */
export const formatDate = (
  timestamp: FirestoreTimestamp | unknown,
  locale: string = 'en-GB',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string => {
  const date = toDate(timestamp as FirestoreTimestamp);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return 'N/A';
  }
};

/**
 * Format a Firestore timestamp to a localized date and time string
 * @param timestamp - Firestore Timestamp or date-like value
 * @param locale - Locale string (default: 'en-GB')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date and time string or 'N/A' if conversion fails
 */
export const formatDateTime = (
  timestamp: FirestoreTimestamp,
  locale: string = 'en-GB',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string => {
  const date = toDate(timestamp);
  if (!date) return 'N/A';
  
  try {
    return date.toLocaleString(locale, options);
  } catch {
    return 'N/A';
  }
};

/**
 * Check if a value is a Firestore Timestamp
 */
export const isFirestoreTimestamp = (value: unknown): value is Timestamp => {
  return value instanceof Timestamp || 
    (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function');
};

