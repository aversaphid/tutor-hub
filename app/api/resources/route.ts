import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreateResourceSchema } from "@/lib/validations";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sanitizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.toLowerCase() !== "general");
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    let isAuthorized =
      !!user &&
      (user.role === "HEAD_TUTOR" || user.role === "TUTOR" || user.role === "TUTEE");

    if (!isAuthorized && key) {
      const student = await prisma.user.findUnique({
        where: { magicKey: key, active: true, role: "TUTEE" },
      });
      if (student) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const tagFilter = searchParams.get("tag") || searchParams.get("category");
    const query = searchParams.get("q")?.trim().toLowerCase();

    const where: any = {};

    if (tagFilter && tagFilter !== "ALL" && tagFilter.toLowerCase() !== "general") {
      where.category = { contains: tagFilter };
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { url: { contains: query } },
        { category: { contains: query } },
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

    const formattedResources = resources.map((r) => ({
      ...r,
      tags: parseTags(r.category),
    }));

    const etagSeed = formattedResources
      .map((r) => `${r.id}-${new Date(r.updatedAt).getTime()}-${r.category}`)
      .join(":");
    const etag = `"${crypto.createHash("md5").update(etagSeed).digest("hex")}"`;

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { resources: formattedResources },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
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

    const { title, url, description, category, tags } = parseResult.data;
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

    const resolvedTags = Array.isArray(tags) && tags.length > 0
      ? tags.map((t) => t.trim()).filter(Boolean).filter((t) => t.toLowerCase() !== "general")
      : parseTags(category);

    if (resolvedTags.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one related tag for this resource." },
        { status: 400 }
      );
    }

    const categoryString = resolvedTags.join(", ");

    const resource = await prisma.resource.create({
      data: {
        title: title.trim(),
        url: sanitizedUrl,
        description: description?.trim() || null,
        category: categoryString,
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
      resource: {
        ...resource,
        tags: resolvedTags,
      },
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
