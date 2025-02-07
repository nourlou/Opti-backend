const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Opti_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(' MongoDB connected successfully');
  } catch (err) {
    console.error(' MongoDB Connection Error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;