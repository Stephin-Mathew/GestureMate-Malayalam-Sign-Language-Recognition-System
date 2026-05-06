// Quick script to check MongoDB user collection
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  imageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema, 'user');

async function checkDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mproject');
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`\nFound ${users.length} users in database:`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDB();
