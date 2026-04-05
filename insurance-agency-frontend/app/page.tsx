import { redirect } from 'next/navigation';

/**
 * The root page of the application.
 * Its only job is to redirect the user to the main dashboard.
 * The dashboard's layout will handle authentication checks.
 */
export default function RootPage() {
  redirect('/dashboard');
}