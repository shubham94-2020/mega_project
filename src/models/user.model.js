import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowecase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowecase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url
      required: true,
    },
    CoverImage: {
      type: String, //cloudinary url
      required: true,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the password before saving the user
UserSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
  
    try {
      // Hash the password with a salt round of 10
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
      next();
    } catch (err) {
      next(err);
    }
  });
  
  // Method to compare the password for login
  UserSchema.methods.isPasswordCorrect = async function (password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (err) {
      throw new Error(err);
    }
  };
  


  UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
    );
  };
  
  UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
      {
        _id: this._id
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
    );
  };
  // Export the User model
  const User = mongoose.model('User', UserSchema);
  
  module.exports = User;
