require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
    });
    console.log('✅ Direct connection successful');
    console.log('Database:', mongoose.connection.name);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
