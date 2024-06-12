import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    console.error("No file path provided.");
    return null;
  }

  try {
    // Upload the file
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // File has been uploaded
    console.log("File uploaded successfully!", response.url);
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);

    // Remove the local file from server/local system
    try {
      fs.unlinkSync(localFilePath);
      console.log("Local file removed successfully.");
    } catch (unlinkError) {
      console.error("Error removing local file:", unlinkError);
    }

    return null;
  }
};

export { uploadOnCloudinary };

// ******************use of upper code****************




// import { uploadOnCloudinary } from "./path_to_your_module";

// const localFilePath = "path/to/your/local/file.jpg";

// uploadOnCloudinary(localFilePath)
//   .then(response => {
//     if (response) {
//       console.log("Upload successful:", response);
//     } else {
//       console.log("Upload failed.");
//     }
//   })
//   .catch(error => {
//     console.error("Unexpected error:", error);
//   });
