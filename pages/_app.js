import "@/styles/globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import UserSync from '../components/UserSync';

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <UserSync />
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
