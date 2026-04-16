import { create } from 'zustand';
import { toast as sonnerToast } from 'sonner';
import { User } from '@/types/api'; // Assuming your User type is here

/**
 * ============================================================================
 * --- Custom Hooks ---
 * ============================================================================
 * This file contains custom React hooks to be used throughout the application.
 * Centralizing them here promotes reusability and consistency.
 */

// ============================================================================
// --- Toast Hook ---
// ============================================================================

/**
 * A simple hook for showing toast notifications.
 * This wraps the `sonner` library, allowing for easy replacement in the future
 * and a single place to add custom logic like error logging.
 */
export const useToast = () => {
  return {
    toast: sonnerToast,
  };
};


// ============================================================================
// --- Current User Hook (Authentication State) ---
// ============================================================================

/**
 * Defines the shape of our authentication state store.
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // For the initial check when the app loads
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * A Zustand store to manage authentication state.
 * This is the private, internal implementation.
 * We avoid exporting this directly to encourage using the `useCurrentUser` hook.
 */
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start in a loading state until the initial user check is done
  
  // Action to set the user after a successful login
  setUser: (user: User) => set({
    user,
    isAuthenticated: true,
    isLoading: false,
  }),

  // Action to clear the user on logout or session expiry
  clearUser: () => set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
  
  // Action to manually control the loading state
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));


/**
 * The primary hook for accessing the current user's data and auth status.
 *
 * This hook is an abstraction over our Zustand store. Using this hook instead of
 * the store directly allows us to change the underlying state management library
 * in the future without refactoring any components.
 *
 * @returns The user object, authentication status, loading state, and actions.
 *
 * @example
 * const { user, isAuthenticated, isLoading } = useCurrentUser();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginComponent />;
 *
 * return <div>Welcome, {user.first_name}!</div>;
 */
export const useCurrentUser = useAuthStore;