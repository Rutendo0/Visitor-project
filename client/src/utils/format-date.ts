import { format, isValid } from "date-fns";

/**
 * Format a date string or Date object
 * @param dateString ISO string or Date object
 * @param formatString date-fns format string (default: 'PPP')
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  dateString: string | Date | undefined | null,
  formatString: string = "PPP"
): string => {
  if (!dateString) return "";
  
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    
    if (!isValid(date)) return "";
    
    return format(date, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
