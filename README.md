# 🛍️ JANYA CREATIONS — E-Commerce Application

A production-ready e-commerce platform for **Janya Creations** built with Next.js App Router, Tailwind CSS, and Supabase.

---

## 🛠️ Tech Stack & Services

* **Framework:** [Next.js](https://nextjs.org/) (App Router, React Server & Client Components)
* **Backend & Auth:** [Supabase](https://supabase.com/) (Database, Auth with Email/Google, Storage)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **State Management:** React Context API (`CartContext`, `WishlistContext`) with `localStorage` persistence

---

## 📁 Complete Folder Structure

```text
JANYA-CREATIONS/
├── public/
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── admin/             # Protected Admin Dashboard & Login
│   │   ├── auth/callback/     # OAuth & Email Verification handler
│   │   ├── cart/              # Shopping Bag
│   │   ├── checkout/          # Checkout with COD, UPI, QR options
│   │   ├── contact/           # Contact Support Page
│   │   ├── forgot-password/   # Password reset request
│   │   ├── login/             # User Login / Signup (Email + Google)
│   │   ├── order-success/     # Order Confirmation
│   │   ├── privacy-policy/    # Privacy Policy Page
│   │   ├── products/[id]/     # Product Detail Page
│   │   ├── profile/           # User Profile & Order History
│   │   ├── refund-policy/     # Return & Refund Policy
│   │   ├── reset-password/    # Reset password target page
│   │   ├── shipping-policy/   # Delivery & Shipping Policy
│   │   ├── shop/              # Product listing & filtering
│   │   ├── terms/             # Terms & Conditions
│   │   ├── wishlist/          # Saved products
│   │   ├── globals.css        # Global CSS styles
│   │   ├── layout.tsx         # Root Layout (Navbar, Footer, Providers)
│   │   ├── not-found.tsx      # Custom 404 page
│   │   └── page.tsx           # Home Landing Page
│   ├── components/
│   │   ├── admin/             # Admin utilities (ImageUpload)
│   │   ├── footer/            # Footer component with policy links
│   │   ├── navbar/            # Navbar with live badges & auth state
│   │   ├── product/           # Reusable ProductCard component
│   │   └── CookieConsent.tsx  # GDPR banner
│   ├── context/
│   │   ├── CartContext.tsx    # Cart state & persistence
│   │   └── WishlistContext.tsx# Wishlist state & persistence
│   ├── lib/
│   │   ├── products.ts        # Product data fetching helper
│   │   └── supabase.ts        # Supabase client initialization
│   └── types/
│       └── index.ts           # TypeScript interfaces
└── .env.local