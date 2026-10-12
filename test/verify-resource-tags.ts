import { prisma } from "../lib/prisma";
import { CreateResourceSchema, UpdateResourceSchema } from "../lib/validations";

async function runTests() {
  console.log("=== Testing Shared Resources Multi-Tag Engine ===");

  // 1. Test CreateResourceSchema validation
  console.log("\n1. Testing CreateResourceSchema...");
  const validData = {
    title: "GCSE Revision Hub",
    url: "https://example.com/gcse",
    tags: ["Past Papers", "Worksheets"],
    description: "Multi-tag revision pack",
  };
  const parseResult = CreateResourceSchema.safeParse(validData);
  if (!parseResult.success) {
    throw new Error(`Schema rejected valid multi-tag input: ${JSON.stringify(parseResult.error)}`);
  }
  console.log("✅ [PASS] CreateResourceSchema accepted multiple tags:", parseResult.data.tags);

  // 2. Test empty tags validation
  const emptyTagsData = {
    title: "Empty Tags",
    url: "https://example.com/empty",
    tags: [],
  };
  const emptyResult = CreateResourceSchema.safeParse(emptyTagsData);
  if (emptyResult.success) {
    throw new Error("Schema should reject empty tags array!");
  }
  console.log("✅ [PASS] CreateResourceSchema rejected empty tags array as expected.");

  // 3. Test UpdateResourceSchema
  console.log("\n2. Testing UpdateResourceSchema...");
  const updateData = {
    tags: ["Online Tools", "Formulas & Specs", "Starters & Plenaries"],
  };
  const updateResult = UpdateResourceSchema.safeParse(updateData);
  if (!updateResult.success) {
    throw new Error(`UpdateResourceSchema rejected valid tags: ${JSON.stringify(updateResult.error)}`);
  }
  console.log("✅ [PASS] UpdateResourceSchema accepted 3 related tags:", updateResult.data.tags);

  // 4. Test database creation & multi-tag comma serialization
  console.log("\n3. Testing Database Multi-Tag Persistence...");
  // Find an admin user to be creator
  const admin = await prisma.user.findFirst({ where: { role: "HEAD_TUTOR" } });
  if (!admin) {
    throw new Error("No admin user found in database!");
  }

  const testTags = ["Past Papers", "Worksheets", "Formulas & Specs"];
  const created = await prisma.resource.create({
    data: {
      title: "Automated Test Resource - Multi-Tag",
      url: "https://example.com/test-multi-tag",
      description: "Testing multiple related tags",
      category: testTags.join(", "),
      createdById: admin.id,
    },
  });

  console.log("✅ [PASS] Resource created with multiple tags:", created.category);

  // 5. Test tag parsing logic
  function parseTags(raw?: string | null): string[] {
    if (!raw) return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.toLowerCase() !== "general");
  }

  const parsedTags = parseTags(created.category);
  if (parsedTags.length !== 3 || !parsedTags.includes("Past Papers") || !parsedTags.includes("Formulas & Specs")) {
    throw new Error(`Parsed tags mismatch: ${JSON.stringify(parsedTags)}`);
  }
  console.log("✅ [PASS] Successfully parsed tags back into array:", parsedTags);

  // 6. Test filtering with multiple tags
  console.log("\n4. Testing Multi-Tag Filter Matching...");
  const selectedFilterTags = ["Worksheets", "Online Tools"];
  const matches = selectedFilterTags.some((filterTag) => parsedTags.includes(filterTag));
  if (!matches) {
    throw new Error("Resource should match filter since it contains 'Worksheets'!");
  }
  console.log("✅ [PASS] Resource matches multi-tag filter ('Worksheets' found).");

  // 7. Verify General tag is filtered out
  const withGeneral = "General, Past Papers, general";
  const cleanedTags = parseTags(withGeneral);
  if (cleanedTags.includes("General") || cleanedTags.includes("general") || cleanedTags.length !== 1) {
    throw new Error(`General tag was not filtered out! Got: ${JSON.stringify(cleanedTags)}`);
  }
  console.log("✅ [PASS] 'General' tag is stripped cleanly. Result:", cleanedTags);

  // 8. Clean up test resource
  await prisma.resource.delete({ where: { id: created.id } });
  console.log("✅ [PASS] Automated test resource deleted cleanly.");

  console.log("\n🎉 ALL SHARED RESOURCES MULTI-TAG TESTS PASSED!\n");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
