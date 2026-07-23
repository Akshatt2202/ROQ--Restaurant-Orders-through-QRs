import { v2 as cloudinary } from "cloudinary";

// Configure the Cloudinary SDK using environment variables.
// These variables are loaded securely and should not be hardcoded.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * Uploads an image buffer directly to Cloudinary.
 * 
 * We wrap `cloudinary.uploader.upload_stream` in a Promise so that it can be
 * used with async/await, allowing for cleaner code where it is called.
 * 
 * @param {Buffer} buffer - The image data stored as a Buffer
 * @param {string} folder - The Cloudinary folder path to save the image into
 * @returns {Promise<string>} A promise that resolves to the secure URL of the uploaded image
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // upload_stream is a writeable stream provided by the Cloudinary Node SDK
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    ).end(buffer); // End the stream by writing the buffer to it
  });
};
