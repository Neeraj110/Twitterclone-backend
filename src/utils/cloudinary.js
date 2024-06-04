import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};
const deleteOnCloudinary = async (url, resource_type) => {
  try {
    if (!url) return null;
    const public_id = url.split("/").slice(7, 9).join("/").split(".")[0];

    return await cloudinary.uploader.destroy(public_id, {
      resource_type,
    });
  } catch (error) {
    throw error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
