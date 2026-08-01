import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import CookieConsent from '@/components/CookieConsent';
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
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}