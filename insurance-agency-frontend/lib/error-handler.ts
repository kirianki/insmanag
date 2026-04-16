import { toast } from 'sonner';

/**
 * Robust error handler for API responses, specifically designed for Django REST Framework.
 * It extracts descriptive messages from various error formats and displays them via toast notifications.
 */
export const handleApiError = (error: any) => {
    // If no response, it's likely a network or CORS issue
    if (!error.response) {
        const networkMsg = 'Network error: Please check your connection or server status.';
        toast.error(networkMsg);
        return networkMsg;
    }

    const { status, data } = error.response;
    let message = 'An unexpected error occurred.';

    // Handle specific status codes
    if (status === 400) {
        // 400 Bad Request often contains validation errors
        if (typeof data === 'object' && data !== null) {
            // Check for non_field_errors or detail
            if (data.non_field_errors) {
                message = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
            } else if (data.detail) {
                message = data.detail;
            } else {
                // Collect first error from field validation
                const firstField = Object.keys(data)[0];
                const fieldError = data[firstField];
                const fieldName = firstField.charAt(0).toUpperCase() + firstField.slice(1).replace(/_/g, ' ');

                if (Array.isArray(fieldError)) {
                    message = `${fieldName}: ${fieldError[0]}`;
                } else if (typeof fieldError === 'string') {
                    message = `${fieldName}: ${fieldError}`;
                } else {
                    message = 'Validation error. Please check your input.';
                }
            }
        }
    } else if (status === 401) {
        message = 'Your session has expired. Please log in again.';
    } else if (status === 403) {
        message = "You don't have permission to perform this action.";
    } else if (status === 404) {
        message = 'The requested resource was not found.';
    } else if (status === 429) {
        message = 'Too many requests. Please try again later.';
    } else if (status >= 500) {
        message = 'Server error. Our team has been notified. Please try again later.';
    } else if (data && typeof data === 'object' && data.detail) {
        message = data.detail;
    }

    // Display the error toast
    toast.error(message, {
        description: `Status: ${status}`,
    });

    return message;
};
