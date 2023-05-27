import mongoose from 'mongoose';
import { MONGO_URL } from '../config';

const connectDB = () => {

  mongoose.set('debug', true);
  mongoose.Promise = global.Promise;
  mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));
  db.once('open', () => {
    console.log('🍃 Connected to MongoDB');
  });
};

export default connectDB;
