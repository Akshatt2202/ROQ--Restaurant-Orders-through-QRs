import { verifyAuth } from "@/middleware/auth";
import { Menu } from "@/model/menu";
import { sendRJResponse } from "@/utils/api";
import { NextRequest, NextResponse } from "next/server";

/** Rename a section by moving every item in it to the new name. */
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

    const body = await req.json();
    const section = String(body?.section ?? "").trim();
    const newSection = String(body?.newSection ?? "").trim();

    if (!section || !newSection) {
      return sendRJResponse({
        success: false,
        message: "Both the current and the new section name are required",
        status: 400,
      });
    }

    if (newSection.length > 60) {
      return sendRJResponse({
        success: false,
        message: "Section name must be 60 characters or fewer",
        status: 400,
      });
    }

    if (section === newSection) {
      return sendRJResponse({
        success: true,
        message: "Section unchanged",
        data: { modifiedCount: 0 },
        status: 200,
      });
    }

    // Renaming onto an existing section would silently merge the two groups,
    // which is not what a rename means - make the merchant pick another name.
    const clash = await Menu.exists({ merchantId, section: newSection });

    if (clash) {
      return sendRJResponse({
        success: false,
        message: "A section with that name already exists",
        status: 409,
      });
    }

    const result = await Menu.updateMany(
      { merchantId, section },
      { $set: { section: newSection } }
    );

    return sendRJResponse({
      success: true,
      message: "Section renamed successfully",
      data: { modifiedCount: result.modifiedCount },
      status: 200,
    });
  } catch (error) {
    console.error("Error while renaming section:", error);

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

    // verifyAuth returns a 401 response object on failure, which is truthy - a
    // bare !merchantId check let unauthenticated calls through to the query.
    if (!merchantId || merchantId instanceof NextResponse) {
      return sendRJResponse({
        success: false,
        message: "Unauthorized",
        status: 401,
      });
    }

    const section = req.nextUrl.searchParams.get("section");

    if (!section) {
      return sendRJResponse({
        success: false,
        message: "Section is required",
        status: 400,
      });
    }

    const result = await Menu.deleteMany({
      merchantId,
      section,
    });

    return sendRJResponse({
      success: true,
      message: "Section deleted successfully",
      data: {
        deletedCount: result.deletedCount,
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error while deleting section:", error);

    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
}
