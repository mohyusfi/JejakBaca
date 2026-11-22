export function sanitizeRedirectPath(path?: string | null): string {
  if (!path) return '/';
  const trimmed = path.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }
  return '/';
}

export function getPostLoginRedirect(
  role: 'admin' | 'user',
  redirect?: string | null,
): string {
  if (role === 'admin') {
    return '/admin/books';
  }
  const cleanPath = sanitizeRedirectPath(redirect);
  if (cleanPath.startsWith('/admin')) {
    return '/';
  }
  return cleanPath;
}
