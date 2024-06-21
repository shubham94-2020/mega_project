// Import necessary modules and functions
import { asyncHandler } from "../utils/asynchandler.js"; // Utility to handle asynchronous operations and errors
import { ApiError } from "../utils/ApiError.js"; // Custom error class for handling API errors consistently
import { User } from "../models/user.model.js"; // Mongoose model for interacting with the User collection in MongoDB
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Utility function to upload files to Cloudinary and get the URL
import { ApiResponse } from "../utils/ApiResponse.js"; // Custom response class for formatting API responses
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const generateAccessTokenAndRefreshToken = async (user_id) => {
  try {
    const user = await User.findOne(user_id);
    if (!user) {
      throw new ApiError(404, "user doesnt exist!");
    }
    const AccessToken = await user.generateAccessToken();
    const RefreshToken = await user.generateRefreshToken();
    if (!AccessToken || !RefreshToken) {
      throw new ApiError(500, "unable to genereate the token!");
    }
    user.refreshToken = RefreshToken;
    await user.save({ validateBeforeSave: false });
    return { AccessToken, RefreshToken };
  } catch (error) {
    throw new ApiError(500, "somemthing went wrong while generating token!");
  }
};

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
  if (is_User_exist) {
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

const loginUser = asyncHandler(async (req, res) => {
  // Get input from the request body
  const { username, email, password } = req.body;
  console.log(username, password);
  // Check if username and password are provided
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required!");
  }

  // Find the user by either email or username
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(404, "User doesn't exist!");
  }

  // Verify if the provided password is correct
  const is_password_correct = await user.isPasswordCorrect(password);
  if (!is_password_correct) {
    throw new ApiError(401, "Password invalid!");
  }

  // Generate access and refresh tokens for the authenticated user
  const { AccessToken, RefreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // Find the user by ID and exclude password and refreshToken fields
  const logged_user = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Set options for the cookies (HTTP only and secure)
  const options = {
    httpOnly: true, // Cookie cannot be accessed or modified by JavaScript
    secure: true, // Cookie is only sent over HTTPS
  };

  // Send the response with the user data and tokens
  return res
    .status(200) // Set HTTP status to 200 (OK)
    .cookie("accessToken", AccessToken, options) // Set AccessToken cookie
    .cookie("refreshToken", RefreshToken, options) // Set RefreshToken cookie
    .json(
      // Correctly format the JSON response
      new ApiResponse(
        200, // Status code for the ApiResponse
        {
          user: logged_user, // Include the user data in the response
          AccessToken, // Include the AccessToken in the response
          RefreshToken, // Include the RefreshToken in the response
        },
        "User logged in successfully!" // Success message
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    //remove refresh token using middleware
    //remove cookies form client
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      }
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    console.log("done from logout controller!");
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user loggedout succesfully!"));
  } catch (error) {
    console.error("Error in logout controller: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    //firstly we have to generate both tokens
    //get the acces to refresh token
    //using this genrate the tokens and send it through cookies
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken; //encrypted refresh token
    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request!");
    }
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      REFRESH_TOKEN_SECRET
    ); //decrypted
    const user = await User.findById(decodedToken?._id); //obtaining paylod from token and obtaining user thorugh payload
    if (!user) {
      throw new ApiError(401, "invalid refresh token!");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      //through user obtain saved refreshtoken
      throw new ApiError(401, "refresh token is expired or used!");
    }
    const { AccessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(decodedToken?._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", AccessToken, options) // Set AccessToken cookie
      .cookie("refreshToken", newRefreshToken, options) // Set RefreshToken cookie
      .json(
        new ApiResponse(
          200,
          { AccessToken, refreshToken: newRefreshToken },
          "access token generated succesfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "user doesnt exist!");
  }
  const verifyPassword = await user.isPasswordCorrect(oldpassword);
  if (!verifyPassword) {
    throw new ApiError(400, "incorrect password");
  }
  user.password = newpassword;
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed succesfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user returned succesfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "fields cant be empty:update account details");
  }
  const user = findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    { new: true } //update hone ke baad jo info hoti hai wo return hoti hai matlab upna user ab naya wala hoga
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated!"));
});
const updateUserAvatar = asyncHandler(
  asyncHandler(async (req, res) => {
    //to upadate avatar multer give path and store it on local then
    //to path uploadoncloudinary() var taka we get object avtar.url user.avatar madhe save kara befor that delete old avatar from cloudinary
    const avatarLocalPath = req.file?.path;
    if (avatarLocalPath) {
      throw new ApiError(400, "file is missing!");
    }


    const olduser=await User.findById(req.user?._id);
    if (!olduser) {
      throw new ApiError(404, "User not found!");
    }
    const currentAvatarUrl = user.avatar;
    // Delete the old avatar from Cloudinary
    if (currentAvatarUrl) {
      const publicId = currentAvatarUrl.split('/').pop().split('.')[0]; // Extract public ID from URL
      await cloudinary.uploader.destroy(publicId); // Use Cloudinary API to delete the image
    }


    const avatar = uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      throw new ApiError(401, "error in uploading!");
    }
    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      {
        new: true,
      }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "avatar changed succesfully!"));
  })
);

const updateCoverImage = asyncHandler(async (req, res) => {
  // Check if a file is provided
  const coverimageLocalPath = req.file?.path;
  if (!coverimageLocalPath) {
    throw new ApiError(400, "File is missing!");
  }

  // Get the current user's cover image URL from the database
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const currentCoverImageUrl = user.CoverImage;

  // Delete the old cover image from Cloudinary
  if (currentCoverImageUrl) {
    const publicId = currentCoverImageUrl.split('/').pop().split('.')[0]; // Extract public ID from URL
    await cloudinary.uploader.destroy(publicId); // Use Cloudinary API to delete the image
  }

  // Upload the new cover image to Cloudinary
  const coverImage = await uploadOnCloudinary(coverimageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(401, "Error in uploading!");
  }

  // Update the user's cover image URL in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        CoverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // Return the updated user response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Cover image changed successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateCoverImage,
};
