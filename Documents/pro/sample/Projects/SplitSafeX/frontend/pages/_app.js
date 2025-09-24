import '../styles/globals.css';
import { AuthProvider } from '../hooks/useAuth';
import { ToastProvider } from '../components/ui/Toast';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Loading from '../components/ui/Loading';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <ToastProvider>
      <AuthProvider>
        {loading && (
          <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
            <Loading size="lg" text="Loading..." />
          </div>
        )}
        <Component {...pageProps} />
      </AuthProvider>
    </ToastProvider>
  );
}