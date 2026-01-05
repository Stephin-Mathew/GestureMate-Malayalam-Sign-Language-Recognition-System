import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

const UserSync = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // Sync user data to MongoDB whenever user is signed in
    if (isSignedIn && user) {
      syncUserToMongoDB();
    }
  }, [isSignedIn, user]);

  const syncUserToMongoDB = async () => {
    try {
      console.log('🔄 Syncing user data to MongoDB...', user.id);

      const userData = {
        clerkId: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        imageUrl: user.imageUrl || '',
      };

      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User data synced to MongoDB:', result.user);
      } else {
        const error = await response.json();
        console.error('❌ Failed to sync user data:', error);
      }
    } catch (error) {
      console.error('❌ Error syncing user to MongoDB:', error);
    }
  };

  // This component doesn't render anything
  return null;
};

export default UserSync;
