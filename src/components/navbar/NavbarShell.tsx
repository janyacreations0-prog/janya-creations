import { getCategoryTree } from '@/lib/categories';
import Navbar from './Navbar';

/**
 * Server wrapper for the Navbar.
 * Loads active categories from Supabase (RLS-filtered) and passes them to the
 * client Navbar as a serializable prop, keeping the nav fully database-driven.
 */
export default async function NavbarShell() {
  const categories = await getCategoryTree();
  return <Navbar categories={categories} />;
}
