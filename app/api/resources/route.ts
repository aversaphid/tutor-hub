import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreateResourceSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

function sanitizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q")?.trim().toLowerCase();

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { url: { contains: query } },
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ resources });
  } catch (err) {
    console.error("Fetch resources error:", err);
    return NextResponse.json(
      { error: "Failed to fetch resources." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HEAD_TUTOR" && user.role !== "TUTOR")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = CreateResourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Validation error." },
        { status: 400 }
      );
    }

    const { title, url, description, category } = parseResult.data;
    const sanitizedUrl = sanitizeUrl(url);

    // Basic check for valid URL structure
    try {
      new URL(sanitizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid website link or URL." },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        title: title.trim(),
        url: sanitizedUrl,
        description: description?.trim() || null,
        category: category?.trim() || "General",
        createdById: user.id,
      },
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
      resource,
      message: "Resource link added to library.",
    });
  } catch (err) {
    console.error("Create resource error:", err);
    return NextResponse.json(
      { error: "Failed to create resource." },
      { status: 500 }
    );
  }
}
