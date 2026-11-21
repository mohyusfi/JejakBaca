import type { LucideIcon } from 'lucide-react';
import {
  BookMarked,
  Bookmark,
  Compass,
  Library,
  ShieldCheck,
} from 'lucide-react';
import type { ActorState } from '../../types/domain';

export interface NavItem {
  id: string;
  label: string;
  mobileLabel: string;
  to: '/' | '/public-books' | '/loans' | '/readlist' | '/admin/books';
  matchPrefix?: string;
  icon: LucideIcon;
  roles: ActorState[];
}

export const DOMAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'library-catalog',
    label: 'Katalog Perpustakaan',
    mobileLabel: 'Katalog',
    to: '/',
    icon: Library,
    roles: ['guest', 'user', 'admin'],
  },
  {
    id: 'public-books',
    label: 'Jelajah Buku Publik',
    mobileLabel: 'Buku Publik',
    to: '/public-books',
    icon: Compass,
    roles: ['guest', 'user', 'admin'],
  },
  {
    id: 'my-loans',
    label: 'Peminjaman Saya',
    mobileLabel: 'Peminjaman',
    to: '/loans',
    icon: BookMarked,
    roles: ['guest', 'user'],
  },
  {
    id: 'my-readlist',
    label: 'Readlist Saya',
    mobileLabel: 'Readlist',
    to: '/readlist',
    icon: Bookmark,
    roles: ['guest', 'user'],
  },
  {
    id: 'admin-workspace',
    label: 'Workspace Admin',
    mobileLabel: 'Admin',
    to: '/admin/books',
    matchPrefix: '/admin',
    icon: ShieldCheck,
    roles: ['admin'],
  },
];

export function getVisibleNavItems(actor: ActorState): NavItem[] {
  return DOMAIN_NAV_ITEMS.filter((item) => item.roles.includes(actor));
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  }
  if (item.to === '/') {
    return pathname === '/';
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
