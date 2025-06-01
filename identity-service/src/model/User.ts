// // models/User.js
// import mongoose from 'mongoose';
// import * as argon2 from 'argon2';

// // Add interface for User methods
// interface IUserMethods {
//   comparePassword(candidatePassword: string): Promise<boolean>;
// }

// // Extend mongoose.Document with our methods
// interface UserModel extends mongoose.Document, IUserMethods {}

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, unique: true, required: true },
//   password: { type: String, required: true },
//   role: {
//     type: String,
//     enum: ['passenger', 'driver', 'both'],
//     default: 'passenger',
//   },
//   createdAt: { type: Date, default: Date.now },
// });

// userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
//   try {
//     return await argon2.verify(this.password, candidatePassword);
//   } catch (error) {
//     throw error;
//   }
// };

// export default mongoose.model<UserModel>('User', userSchema);


import mongoose from 'mongoose';
import * as argon2 from 'argon2';

// Define the interface for User document
interface IUser {
  name: string;
  email: string;
  password: string;
  role: 'passenger' | 'driver' | 'both';
  createdAt: Date;
}

// Add interface for User methods
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Combine the interfaces
interface UserModel extends mongoose.Document, IUser, IUserMethods {}

const userSchema = new mongoose.Schema<UserModel>({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['passenger', 'driver', 'both'],
    default: 'passenger',
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate hash
    const hash = await argon2.hash(this.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1
    });
    
    // Override the plain text password with hash
    this.password = hash;
    next();
  } catch (error) {
    next(error as Error);
  }
});


userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model<UserModel>('User', userSchema);