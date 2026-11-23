import { describe, expect, it } from 'vitest';
import { getPostLoginRedirect, sanitizeRedirectPath } from '../auth-redirect';

describe('auth-redirect utilities', () => {
  describe('sanitizeRedirectPath', () => {
    it('mengembalikan / jika input kosong, null, atau undefined', () => {
      expect(sanitizeRedirectPath(undefined)).toBe('/');
      expect(sanitizeRedirectPath(null)).toBe('/');
      expect(sanitizeRedirectPath('')).toBe('/');
      expect(sanitizeRedirectPath('   ')).toBe('/');
    });

    it('mempertahankan path internal yang valid diawali /', () => {
      expect(sanitizeRedirectPath('/loans')).toBe('/loans');
      expect(sanitizeRedirectPath('/readlist?page=2')).toBe('/readlist?page=2');
      expect(sanitizeRedirectPath('/public-books')).toBe('/public-books');
    });

    it('menolak external URL dan protocol-relative URLs untuk mencegah open-redirect', () => {
      expect(sanitizeRedirectPath('https://evil.com')).toBe('/');
      expect(sanitizeRedirectPath('http://malicious.org/phish')).toBe('/');
      expect(sanitizeRedirectPath('//attacker.site')).toBe('/');
      expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/');
    });
  });

  describe('getPostLoginRedirect', () => {
    it('selalu mengarahkan akun berrole admin ke /admin/books', () => {
      expect(getPostLoginRedirect('admin')).toBe('/admin/books');
      expect(getPostLoginRedirect('admin', '/loans')).toBe('/admin/books');
      expect(getPostLoginRedirect('admin', '/readlist')).toBe('/admin/books');
      expect(getPostLoginRedirect('admin', '/public-books')).toBe('/admin/books');
    });

    it('mengarahkan akun berrole user ke parameter redirect yang valid', () => {
      expect(getPostLoginRedirect('user', '/loans')).toBe('/loans');
      expect(getPostLoginRedirect('user', '/readlist')).toBe('/readlist');
      expect(getPostLoginRedirect('user', '/public-books')).toBe('/public-books');
    });

    it('mengarahkan akun berrole user ke / bila parameter redirect kosong', () => {
      expect(getPostLoginRedirect('user')).toBe('/');
      expect(getPostLoginRedirect('user', null)).toBe('/');
      expect(getPostLoginRedirect('user', '')).toBe('/');
    });

    it('menolak rute admin untuk user dan mengembalikan ke /', () => {
      expect(getPostLoginRedirect('user', '/admin/books')).toBe('/');
      expect(getPostLoginRedirect('user', '/admin/loans')).toBe('/');
    });

    it('menolak URL eksternal berbahaya untuk user dan mengembalikan ke /', () => {
      expect(getPostLoginRedirect('user', 'https://phishing.com')).toBe('/');
      expect(getPostLoginRedirect('user', '//malware.site')).toBe('/');
    });
  });
});
