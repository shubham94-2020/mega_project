import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Load environment variables from .env file
dotenv.config();

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    // Retrieve token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  
    // If token is not provided, throw unauthorized error
    if (!token) {
      throw new ApiError(401, "Unauthorized request!!");
    }
  
    // Verify and decode the token
    let decoded_token;
    try {
      decoded_token = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      throw new ApiError(401, "Invalid access token");
    }
  
    // Find user by ID and exclude password and refreshToken fields
    const user = await User.findById(decoded_token?._id).select("-password -refreshToken");
    // console.log(user);
  
    // If user does not exist, throw unauthorized error
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
  
    // Attach user to request object
    req.user = user;
    // Proceed to next middleware or route handler
    console.log("done from auth_middleware!");
    next();
  } catch (error) {
    throw new ApiError(401,error?.message)
  }
});
