import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Handle route changes and errors
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // You can add analytics or other route change logic here
      console.log('App is changing to: ', url);
    };

    const handleRouteError = (error: any) => {
      console.error('Route error:', error);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeError', handleRouteError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router.events]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default MyApp;
