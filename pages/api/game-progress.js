import connectToDatabase from '../../lib/mongodb';
import GameProgress from '../../models/GameProgress';

export default async function handler(req, res) {
  try {
    await connectToDatabase();
  } catch (err) {
    return res.status(500).json({ message: 'Database connection failed' });
  }

  // GET — fetch progress for a user
  if (req.method === 'GET') {
    const { clerkId } = req.query;
    if (!clerkId) return res.status(400).json({ message: 'clerkId is required' });

    try {
      let progress = await GameProgress.findOne({ clerkId });
      if (!progress) {
        // Return a default "fresh" progress without saving to DB yet
        return res.status(200).json({
          clerkId,
          currentLevel: 1,
          completedLevels: [],
          totalXP: 0,
        });
      }
      return res.status(200).json(progress);
    } catch (err) {
      console.error('GET game-progress error:', err);
      return res.status(500).json({ message: 'Failed to fetch progress' });
    }
  }

  // POST — save a completed level
  if (req.method === 'POST') {
    const { clerkId, level, timeTakenSeconds, attempts, xpEarned } = req.body;
    if (!clerkId || !level) {
      return res.status(400).json({ message: 'clerkId and level are required' });
    }

    try {
      let progress = await GameProgress.findOne({ clerkId });

      if (!progress) {
        progress = new GameProgress({ clerkId });
      }

      // Check if level already completed — if so, just update attempt count
      const existingIdx = progress.completedLevels.findIndex(l => l.level === level);
      if (existingIdx >= 0) {
        progress.completedLevels[existingIdx].attempts += 1;
        // Update best time if faster
        if (timeTakenSeconds < progress.completedLevels[existingIdx].timeTakenSeconds) {
          progress.completedLevels[existingIdx].timeTakenSeconds = timeTakenSeconds;
          progress.completedLevels[existingIdx].completedAt = new Date();
        }
      } else {
        // New level completed
        progress.completedLevels.push({
          level,
          timeTakenSeconds: timeTakenSeconds || 0,
          attempts: attempts || 1,
          completedAt: new Date(),
        });
        progress.totalXP += xpEarned || 100;
      }

      // Advance currentLevel if this level unlocks the next
      if (level >= progress.currentLevel) {
        progress.currentLevel = level + 1;
      }

      progress.updatedAt = new Date();
      await progress.save();

      return res.status(200).json({
        message: 'Progress saved',
        currentLevel: progress.currentLevel,
        totalXP: progress.totalXP,
        completedLevels: progress.completedLevels,
      });
    } catch (err) {
      console.error('POST game-progress error:', err);
      return res.status(500).json({ message: 'Failed to save progress' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
