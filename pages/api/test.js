export default async function handler(req, res) {
  try {
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash('test', 10);
    res.status(200).json({ message: 'bcrypt works!', hash: hash.substring(0, 10) + '...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
