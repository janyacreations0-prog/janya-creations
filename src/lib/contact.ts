/**
 * Verified Janya Creations business details.
 * Single source of truth for all customer-facing contact information.
 */

export const BUSINESS = {
  name: 'Janya Creations',
  email: 'janyacreations0@gmail.com',
  phone: '+91 9873793892',
  address: {
    line1: 'D1104, Sector 10',
    line2: 'Greater Noida West',
    city: 'Greater Noida West',
    state: 'Uttar Pradesh',
    pincode: '201306',
    country: 'India',
  },
};

export function businessAddress(): string {
  return `${BUSINESS.address.line1}, ${BUSINESS.address.line2}, ${BUSINESS.address.state} – ${BUSINESS.address.pincode}, ${BUSINESS.address.country}`;
}

/** Fixed revision date for policy pages (not dynamically rendered). */
export const SITE_UPDATED = '25 August 2026';
