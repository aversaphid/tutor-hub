import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UpdateResourceSchema } from "@/lib/validations";

function sanitizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.resource.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    // Tutors can only edit their own resources; HEAD_TUTOR can edit any
    if (user.role === "TUTOR" && existing.createdById !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only edit resources you created." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateResourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error." },
        { status: 400 }
      );
    }

    const { title, url, description, category } = parseResult.data;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (url !== undefined) {
      const sanitizedUrl = sanitizeUrl(url);
      try {
        new URL(sanitizedUrl);
      } catch {
        return NextResponse.json(
          { error: "Please enter a valid website link or URL." },
          { status: 400 }
        );
      }
      updateData.url = sanitizedUrl;
    }
    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }
    if (category !== undefined) {
      updateData.category = category.trim() || "General";
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      resource: updated,
      message: "Resource updated successfully.",
    });
  } catch (err) {
    console.error("Update resource error:", err);
    return NextResponse.json(
      { error: "Failed to update resource." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.resource.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    // Tutors can only delete their own resources; HEAD_TUTOR can delete any
    if (user.role === "TUTOR" && existing.createdById !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You can only delete resources you created." },
        { status: 403 }
      );
    }

    await prisma.resource.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Resource removed from library.",
    });
  } catch (err) {
    console.error("Delete resource error:", err);
    return NextResponse.json(
      { error: "Failed to delete resource." },
      { status: 500 }
    );
  }
}
