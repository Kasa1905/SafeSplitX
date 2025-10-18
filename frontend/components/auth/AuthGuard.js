import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../ui/Loading';

export default function AuthGuard({ children, redirectTo = '/auth/login' }) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && initialized && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, initialized, router, redirectTo]);

  // Show loading while checking authentication
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  // Show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  // User is authenticated, render children
  return children;
}