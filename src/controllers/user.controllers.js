// Import necessary modules and functions
import { asyncHandler } from "../utils/asynchandler.js"; // Utility to handle asynchronous operations and errors
import { ApiError } from "../utils/ApiError.js"; // Custom error class for handling API errors consistently
import { User } from "../models/user.model.js"; // Mongoose model for interacting with the User collection in MongoDB
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Utility function to upload files to Cloudinary and get the URL
import { ApiResponse } from "../utils/ApiResponse.js"; // Custom response class for formatting API responses

// Define the registerUser function and handle it asynchronously
const registerUser = asyncHandler(async (req, res) => {
  // Extract user details from the request body
  const { fullname, username, email, password } = req.body;
  console.log("request.body", req.body); // Debug log to check the email being processed
  console.log("request.files", req.files);
  // Check if any of the required fields are empty
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required"); // Throw an error if any field is empty
  }

  // Check if a user with the same username or email already exists in the database
  const is_User_exist = await User.findOne({ $or: [{ username }, { email }] }); // Await the asynchronous call to find an existing user
  if (is_User_exist) 
    {
      throw new ApiError(409, "User already exists!");
    } // Throw an error if the user already exists

  // Multer middleware provides the uploaded files in req.files
  // Get the local file path of the avatar and cover image from the uploaded files
  const avatarLocalFilePath = req.files?.avatar?.[0]?.path; // Optional chaining to avoid errors if the file is not present
  const coverImageLocalFilePath = req.files?.CoverImage?.[0]?.path; // Optional chaining for cover image file path

  // Check if the avatar file is provided
  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar field is required!"); // Throw an error if the avatar is not provided
  }

  // Upload avatar and cover image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalFilePath); // Upload avatar and get the URL
  // Upload cover image if provided, otherwise set an empty string for the URL
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  // Create a new user object and save it to the database
  const user = await User.create({
    fullname,
    avatar: avatar.url, // Set the avatar URL from Cloudinary
    CoverImage: coverImage?.url || "", // Set the cover image URL from Cloudinary or an empty string
    email,
    password,
    username: username.toLowerCase(), // Store username in lowercase for consistency
  });

  // Retrieve the created user from the database and exclude the password and refresh token fields
  const created_user = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!created_user)
    throw new ApiError(500, "Something went wrong in controller!"); // Throw an error if the user retrieval fails

  // Send a successful response with the created user details
  return res
    .status(201)
    .json(new ApiResponse(200, created_user, "User registered")); // Send a 201 Created status with user details
});

// Export the registerUser function
export { registerUser };
