// testing user model
import mongoose from 'mongoose';
import {User} from '../../models'; // Update the path to your user model

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to the database before running the tests
    await mongoose.connect('mongodb://localhost/testDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Disconnect from the database after running the tests
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear the users collection before each test
    await User.deleteMany();
  });

  it('should create a new user', async () => {
    const userData = {
      fullName: 'John Doe',
      userName: 'johndoe',
      email: 'johndoe@example.com',
      password: 'password123',
      // Provide values for other properties as needed
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.fullName).toBe(userData.fullName);
    expect(savedUser.userName).toBe(userData.userName);
    expect(savedUser.email).toBe(userData.email);
    // Add assertions for other properties

    // Additional assertions can be made based on your specific requirements
  });

  // Add more test cases as needed to cover different scenarios

});
