// MongoDB Demo Script - Demonstrates user storage in MongoDB
// Run with: node mongodb-demo.js

const mongoose = require('mongoose');

// User Schema (same as in the app)
const UserSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters']
    // Note: Password is stored as plain text for demo purposes only
    // In production, use proper password hashing like bcrypt
  },
  createdAt: {
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

async function createUser(userData) {
  try {
    console.log('\n📝 Creating user...');
    const user = await User.create(userData);
    console.log('✅ User created successfully!');
    console.log('📋 User details:', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt
    });
    return user;
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

async function findUserByEmail(email) {
  try {
    console.log('\n🔍 Finding user by email...');
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (user) {
      console.log('✅ User found!');
      console.log('📋 User details:', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt
      });
      return user;
    } else {
      console.log('❌ User not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding user:', error.message);
    throw error;
  }
}

async function validateLogin(email, password) {
  try {
    console.log('\n🔐 Validating login credentials...');
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    // Simple password check (NOT SECURE for production!)
    if (user.password === password) {
      console.log('✅ Login successful!');
      return true;
    } else {
      console.log('❌ Invalid password');
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating login:', error.message);
    throw error;
  }
}

async function listAllUsers() {
  try {
    console.log('\n📊 Listing all users in database...');
    const users = await User.find({}).select('-password'); // Exclude passwords
    console.log(`📈 Found ${users.length} user(s):`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Created: ${user.createdAt}`);
    });
    return users;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

async function demo() {
  try {
    console.log('🚀 Starting MongoDB Demo for SignLearn Authentication');
    console.log('=' .repeat(60));

    // Connect to database
    await connectToDatabase();

    // Test data
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    // 1. Create a user (signup simulation)
    console.log('\n🎯 Step 1: User Registration (Signup)');
    await createUser(testUser);

    // 2. Find user by email (login lookup simulation)
    console.log('\n🎯 Step 2: User Lookup (Login Email Check)');
    await findUserByEmail(testUser.email);

    // 3. Validate login credentials
    console.log('\n🎯 Step 3: Login Validation');
    const loginValid = await validateLogin(testUser.email, testUser.password);
    console.log('Login result:', loginValid ? 'SUCCESS' : 'FAILED');

    // Try invalid login
    console.log('\n🎯 Step 4: Invalid Login Test');
    const invalidLogin = await validateLogin(testUser.email, 'wrongpassword');
    console.log('Invalid login result:', invalidLogin ? 'SUCCESS' : 'FAILED');

    // 4. List all users
    console.log('\n🎯 Step 5: Database Contents');
    await listAllUsers();

    console.log('\n🎉 MongoDB Demo completed successfully!');
    console.log('📝 Users are stored in MongoDB database "mproject" in collection "user"');

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
