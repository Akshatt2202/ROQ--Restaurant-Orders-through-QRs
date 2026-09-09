import { verifyAuth } from "@/middleware/auth";
import { Menu } from "@/model/menu";
import { sendRJResponse } from "@/utils/api";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

/** Update the editable fields of one item. Image and section are not touched. */
export async function PATCH(req: NextRequest) {
  try {
    const merchantId = await verifyAuth(req);

    if (!merchantId || merchantId instanceof NextResponse) {
      return sendRJResponse({
        success: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    const { id, title, price, originalPrice, quantity } = await req.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendRJResponse({
        success: false,
        message: "Valid menu id is required",
        status: 400,
      });
    }

    const update: Record<string, unknown> = {};
    const clear: Record<string, unknown> = {};

    if (title !== undefined) {
      const clean = String(title).trim();

      if (!clean || clean.length > 120) {
        return sendRJResponse({
          success: false,
          message: "Name must be between 1 and 120 characters",
          status: 400,
        });
      }

      update.title = clean;
    }

    if (price !== undefined) {
      const value = Number(price);

      if (!Number.isFinite(value) || value < 0) {
        return sendRJResponse({
          success: false,
          message: "Price must be zero or more",
          status: 400,
        });
      }

      update.price = value;
    }

    if (originalPrice !== undefined) {
      // Mongoose drops undefined from a $set, so removing the strike-through
      // price needs an explicit $unset rather than setting it to zero.
      if (originalPrice === null || originalPrice === "") {
        clear.originalPrice = "";
      } else {
        const value = Number(originalPrice);

        if (!Number.isFinite(value) || value < 0) {
          return sendRJResponse({
            success: false,
            message: "Original price must be zero or more",
            status: 400,
          });
        }

        update.originalPrice = value;
      }
    }

    if (quantity !== undefined) {
      const value = Number(quantity);

      if (!Number.isFinite(value) || value < 0) {
        return sendRJResponse({
          success: false,
          message: "Quantity must be zero or more",
          status: 400,
        });
      }

      update.quantity = value;
    }

    if (Object.keys(update).length === 0 && Object.keys(clear).length === 0) {
      return sendRJResponse({
        success: false,
        message: "Nothing to update",
        status: 400,
      });
    }

    const patch: Record<string, unknown> = {};
    if (Object.keys(update).length) patch.$set = update;
    if (Object.keys(clear).length) patch.$unset = clear;

    // Scoped by merchantId, so one merchant cannot edit another's menu.
    const updated = await Menu.findOneAndUpdate(
      { _id: id, merchantId },
      patch,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return sendRJResponse({
        success: false,
        message: "Menu item not found",
        status: 404,
      });
    }

    return sendRJResponse({
      success: true,
      message: "Menu item updated successfully",
      data: updated,
      status: 200,
    });
  } catch (error) {
    console.error("Error updating menu item:", error);

    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const merchantId = await verifyAuth(req);

    // verifyAuth hands back a 401 response object on failure, which is truthy -
    // a bare !merchantId check let unauthenticated calls fall through.
    if (!merchantId || merchantId instanceof NextResponse) {
      return sendRJResponse({
        success: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendRJResponse({
        success: false,
        message: "Valid menu id is required",
        status: 400,
      });
    }

    const deletedMenu = await Menu.findOneAndDelete({
      _id: id,
      merchantId,
    });

    if (!deletedMenu) {
      return sendRJResponse({
        success: false,
        message: "Menu item not found",
        status: 404,
      });
    }

    return sendRJResponse({
      success: true,
      message: "Menu item deleted successfully",
      data: deletedMenu,
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);

    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
}
