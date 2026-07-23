import { verifyAuth } from "@/middleware/auth";
import { Menu } from "@/model/menu";
import { uploadToCloudinary } from "@/service/cloudnary";
import { sendRJResponse } from "@/utils/api";
import { NextRequest } from "next/server";

// The maximum file size allowed for uploaded images (12 MB)
const MAX_FILE_SIZE_MB = 12;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Handles the POST request to upload a new menu item image and details.
 * Expected to receive multipart/form-data containing the image, title, section, price, etc.
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate the merchant making the request
    const merchantId = await verifyAuth(req);

    if (!merchantId) {
      return sendRJResponse({
        success: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    // Step 2: Extract data from the incoming FormData
    const formData = await req.formData();

    const file = formData.get("image") as File | null;
    const title = String(formData.get("title") || "").trim();
    const section = String(formData.get("section") || "").trim();

    const priceRaw = formData.get("price");
    const originalPriceRaw = formData.get("originalPrice");
    const quantity = Number(formData.get("quantity"));

    const price = Number(priceRaw);
    const originalPrice =
      originalPriceRaw !== null && originalPriceRaw !== ""
        ? Number(originalPriceRaw)
        : undefined;

    if (!file || !title || !section || isNaN(price)) {
      return sendRJResponse({
        success: false,
        status: 400,
        message: "Invalid input data",
      });
    }

    // Step 3: Validate the uploaded file type and size

    if (!file.type.startsWith("image/")) {
      return sendRJResponse({
        success: false,
        status: 400,
        message: "Only image files allowed",
      });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return sendRJResponse({
        success: false,
        status: 400,
        message: `File is too large. Max size is ${MAX_FILE_SIZE_MB}MB`,
      });
    }

    // Step 4: Convert the file into a buffer so it can be uploaded via the Cloudinary SDK

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Step 5: Upload the image buffer to Cloudinary
    const imageUrl = await uploadToCloudinary(
      buffer,
      `qr-menu/${merchantId}`
    );

    // Step 6: Save the new menu item to the database using the uploaded image URL

    const menu = await Menu.create({
      merchantId,
      image: imageUrl,
      title,
      price,
      originalPrice,
      section,
      quantity
    });

    // Step 7: Send a success response back to the client
    return sendRJResponse({
      success: true,
      message: "Menu uploaded successfully",
      data: menu,
      status: 201,
    });
  } catch (error) {
    console.error("Error while menu upload:", error);

    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
}