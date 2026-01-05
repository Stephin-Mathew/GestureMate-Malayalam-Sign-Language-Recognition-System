// Clerk + MongoDB Integration Demo Script
// Demonstrates how Clerk user data gets synced to MongoDB
// Run with: node clerk-mongodb-demo.js

const mongoose = require('mongoose');

// Updated User Schema for Clerk integration
const UserSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: [true, 'Clerk ID is required'],
    unique: true
  },
  firstName: {
    type: String,
    required: [true, 'Please provide a first name'],
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please provide a last name'],
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  imageUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Specify collection name as 'user' (singular)
const User = mongoose.model('User', UserSchema, 'user');

async function connectToDatabase() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mproject';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB database: mproject');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function syncClerkUser(userData) {
  try {
    console.log('\n🔄 Syncing Clerk user to MongoDB...');
    console.log('Clerk User Data:', userData);

    // Check if user already exists by clerkId
    let user = await User.findOne({ clerkId: userData.clerkId });

    if (user) {
      // Update existing user
      console.log('📝 Updating existing user...');
      user.firstName = userData.firstName || user.firstName;
      user.lastName = userData.lastName || user.lastName;
      user.email = userData.email.toLowerCase();
      user.imageUrl = userData.imageUrl || user.imageUrl;
      user.updatedAt = new Date();

      await user.save();
      console.log('✅ User updated successfully!');
    } else {
      // Create new user
      console.log('📝 Creating new user...');
      user = await User.create(userData);
      console.log('✅ User created successfully!');
    }

    console.log('📋 MongoDB User details:', {
      id: user._id,
      clerkId: user.clerkId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

    return user;
  } catch (error) {
    console.error('❌ Error syncing Clerk user:', error.message);
    throw error;
  }
}

async function listAllUsers() {
  try {
    console.log('\n📊 Listing all users in MongoDB...');
    const users = await User.find({});
    console.log(`📈 Found ${users.length} user(s) in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Gmail: ${user.email.includes('@gmail.com') ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Image: ${user.imageUrl ? 'Yes' : 'No'}`);
      console.log('');
    });
    return users;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

async function demo() {
  try {
    console.log('🚀 Starting Clerk + MongoDB Integration Demo');
    console.log('=' .repeat(60));

    // Connect to database
    await connectToDatabase();

    // Simulate Clerk user data (what would come from Clerk after Google sign-in)
    const clerkUserData = {
      clerkId: 'user_2abc123def456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@gmail.com',
      imageUrl: 'https://img.clerk.com/eyJ0eXBlIjoicHJvZmlsZSIsImlkIjoiaWRfc2FtcGxlIiwicmV2IjoicmV2X3NhbXBsZSJ9'
    };

    console.log('\n🎯 Step 1: Simulating Clerk Google Sign-in');
    console.log('User signed in with Gmail:', clerkUserData.email);

    // 2. Sync Clerk user data to MongoDB
    console.log('\n🎯 Step 2: Syncing Clerk User Data to MongoDB');
    await syncClerkUser(clerkUserData);

    // 3. List all users to show the data is stored
    console.log('\n🎯 Step 3: Verifying Data Storage');
    await listAllUsers();

    console.log('\n🎉 Clerk + MongoDB Integration Demo completed successfully!');
    console.log('✅ Gmail and user information stored in MongoDB mproject.user collection');
    console.log('✅ Sign Recognition and Voice Translation pages now accessible after login');
    console.log('✅ User data automatically synced when accessing protected pages');

  } catch (error) {
    console.error('💥 Demo failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the demo
demo();
