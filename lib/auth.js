// Clerk-based auth utilities
// Note: These are now handled by Clerk hooks in components
// This file is kept for backward compatibility but should be replaced with Clerk hooks

export function isAuthenticated() {
  // This should be replaced with useAuth() hook from Clerk
  console.warn('isAuthenticated() is deprecated. Use useAuth() hook from @clerk/nextjs instead.');
  return false;
}

export function getStoredUser() {
  // This should be replaced with useUser() hook from Clerk
  console.warn('getStoredUser() is deprecated. Use useUser() hook from @clerk/nextjs instead.');
  return null;
}

export function setStoredUser(user) {
  // This should be replaced with Clerk's built-in user management
  console.warn('setStoredUser() is deprecated. User data is managed by Clerk.');
}

export function clearStoredUser() {
  // This should be replaced with Clerk's signOut function
  console.warn('clearStoredUser() is deprecated. Use signOut() from @clerk/nextjs instead.');
}
