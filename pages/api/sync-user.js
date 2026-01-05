import connectToDatabase from '../../lib/mongodb';
import User from '../../model/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { clerkId, firstName, lastName, email, imageUrl } = req.body;

    if (!clerkId || !email) {
      return res.status(400).json({
        message: 'Clerk ID and email are required'
      });
    }

    // Check if user already exists by clerkId
    let user = await User.findOne({ clerkId });

    if (user) {
      // Update existing user
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.email = email.toLowerCase();
      user.imageUrl = imageUrl || user.imageUrl;
      user.updatedAt = new Date();

      await user.save();

      res.status(200).json({
        message: 'User updated in MongoDB',
        user: {
          id: user._id,
          clerkId: user.clerkId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt
        }
      });
    } else {
      // Create new user
      user = await User.create({
        clerkId,
        firstName: firstName || '',
        lastName: lastName || '',
        email: email.toLowerCase(),
        imageUrl: imageUrl || '',
      });

      res.status(201).json({
        message: 'User synced to MongoDB successfully',
        user: {
          id: user._id,
          clerkId: user.clerkId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt
        }
      });
    }

  } catch (error) {
    console.error('Sync user error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this Clerk ID already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
}
