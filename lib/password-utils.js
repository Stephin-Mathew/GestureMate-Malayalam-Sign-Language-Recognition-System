// Server-side password utilities
// These functions should only be used in API routes

export async function hashPassword(password) {
  const bcrypt = (await import('bcrypt')).default;
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(password, hashedPassword) {
  const bcrypt = (await import('bcrypt')).default;
  return await bcrypt.compare(password, hashedPassword);
}
