import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import NavbarShell from '@/components/navbar/NavbarShell';
import Footer from '@/components/footer/Footer';
import CookieConsent from '@/components/CookieConsent';
import Chatbot from '@/components/chatbot/Chatbot';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <WishlistProvider>
          <CartProvider>
            <NavbarShell />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <CookieConsent />
            <Chatbot />
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}