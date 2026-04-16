import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// This function remains from the shadcn/ui setup.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- NEWLY ADDED FUNCTION ---

// Define the Role type here so it's centrally available.
export type Role = 'Agent' | 'Branch Manager' | 'Agency Admin' | 'Superuser';

// Define a flexible User type that handles the roles property
interface UserWithRoles {
  roles?: Array<string | { name: string }>;
}

/**
 * A robust utility function to extract role names from the user object.
 * The API blueprint only says `roles` is an `array`. This function handles
 * two common possibilities from the backend:
 * 1. An array of strings: `['Agent', 'Manager']`
 * 2. An array of objects with a name property: `[{ name: 'Agent' }, { name: 'Manager' }]`
 * 
 * @param user The user object from the useAuth hook.
 * @returns An array of Role strings.
 */
export const getUserRoles = (user: UserWithRoles | null | undefined): Role[] => {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }
  
  // Check the structure of the first element to decide how to parse
  if (user.roles.length > 0) {
    const firstRole = user.roles[0];
    if (typeof firstRole === 'string') {
      return user.roles as Role[];
    }
    if (typeof firstRole === 'object' && firstRole !== null && 'name' in firstRole && typeof firstRole.name === 'string') {
      return user.roles.map((role) => (role as { name: string }).name) as Role[];
    }
  }

  return []; // Return empty if format is unknown or array is empty
};