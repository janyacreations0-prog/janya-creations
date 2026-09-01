import { BUSINESS } from '../contact';

/**
 * Store FAQ configuration — a maintainable content source for the chatbot.
 * Add/edit entries here without touching the chatbot component.
 */

export interface FaqEntry {
  id: string;
  keywords: string[];
  answer: string;
  link?: { label: string; href: string };
}

export const FAQS: FaqEntry[] = [
  {
    id: 'shipping',
    keywords: ['shipping', 'delivery', 'deliver', 'dispatch', 'courier', 'how long', 'when will i get'],
    answer:
      'We ship across India and shipping is free on all orders. Orders are processed after payment confirmation and estimated delivery timelines may vary by destination and logistics conditions.',
    link: { label: 'Shipping Policy', href: '/shipping-policy' },
  },
  {
    id: 'returns',
    keywords: ['return', 'refund', 'exchange', 'return policy', 'money back'],
    answer:
      'Eligible items can be returned within the window described in our Return & Refund Policy. To start a return, contact our support team with your order number. Approved refunds are processed manually to the original payment method.',
    link: { label: 'Return & Refund Policy', href: '/refund-policy' },
  },
  {
    id: 'payment',
    keywords: ['payment', 'pay', 'upi', 'card', 'netbanking', 'cashfree', 'how do i pay'],
    answer:
      'We accept payments securely through Cashfree. After placing your order you will be redirected to Cashfree\'s secure payment page to complete your payment, and your order is confirmed only once the payment succeeds.',
    link: { label: 'Payment Information', href: '/payment-information' },
  },
  {
    id: 'cancel',
    keywords: ['cancel', 'cancellation', 'cancel order'],
    answer:
      'To cancel an order, contact our support team before the order ships. After shipment, cancellation may not be possible — you can request a return instead.',
    link: { label: 'Cancellation Policy', href: '/cancellation-policy' },
  },
  {
    id: 'contact',
    keywords: ['contact', 'support', 'help', 'reach', 'phone', 'email', 'call'],
    answer: `You can reach us at ${BUSINESS.email} or call ${BUSINESS.phone}. We are happy to help with any questions about your order or our products.`,
  },
  {
    id: 'track',
    keywords: ['track', 'where is my order', 'order status', 'my order', 'status of order'],
    answer:
      'Sign in to your account and open My Orders to see your order status. Guests, please sign in first so I can look up your order securely.',
    link: { label: 'My Orders', href: '/orders' },
  },
  {
    id: 'care',
    keywords: ['care', 'maintain', 'clean', 'tarnish', 'anti tarnish'],
    answer:
      'Our anti-tarnish pieces are designed for everyday wear. Store jewellery in a dry pouch and avoid contact with water and perfume to keep it looking new.',
  },
];
