import "@/styles/globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import UserSync from '../components/UserSync';
import { ThemeProvider } from '../context/ThemeContext';

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <ThemeProvider>
        <UserSync />
        <Component {...pageProps} />
      </ThemeProvider>
    </ClerkProvider>
  );
}
