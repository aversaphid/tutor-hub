import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Archived & Upcoming Lesson Sorting Logic", () => {
  const mockUpcomingLessons = [
    { id: "up-3", title: "Later Next Week", scheduledStartTime: "2026-10-28T16:00:00.000Z" },
    { id: "up-1", title: "Soonest Tomorrow", scheduledStartTime: "2026-10-19T10:00:00.000Z" },
    { id: "up-2", title: "In 3 Days", scheduledStartTime: "2026-10-22T14:00:00.000Z" },
  ];

  const mockArchivedLessons = [
    { id: "arch-old", title: "Lesson 6 Months Ago", scheduledStartTime: "2026-04-10T10:00:00.000Z" },
    { id: "arch-recent", title: "Lesson Yesterday", scheduledStartTime: "2026-10-17T15:00:00.000Z" },
    { id: "arch-mid", title: "Lesson Last Week", scheduledStartTime: "2026-10-11T11:00:00.000Z" },
  ];

  const makeSortList = (lessonSortBy: string) => {
    return (list: any[], isPast = false) => {
      return [...list].sort((a, b) => {
        if (lessonSortBy === "soonest") {
          if (isPast) {
            return new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime();
          }
          return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
        }
        if (lessonSortBy === "newest") {
          return new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime();
        }
        if (lessonSortBy === "oldest") {
          return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime();
        }
        return 0;
      });
    };
  };

  it("sorts upcoming lessons with 'soonest' starting earliest in the future", () => {
    const sort = makeSortList("soonest");
    const sorted = sort(mockUpcomingLessons, false);
    assert.equal(sorted[0].id, "up-1"); // 19 Oct
    assert.equal(sorted[1].id, "up-2"); // 22 Oct
    assert.equal(sorted[2].id, "up-3"); // 28 Oct
  });

  it("flips 'soonest' for archived lessons so the most recent is at the top", () => {
    const sort = makeSortList("soonest");
    const sorted = sort(mockArchivedLessons, true);
    assert.equal(sorted[0].id, "arch-recent"); // Yesterday (17 Oct) at top
    assert.equal(sorted[1].id, "arch-mid");    // Last week (11 Oct)
    assert.equal(sorted[2].id, "arch-old");    // 6 months ago (April) at bottom
  });

  it("respects 'oldest' sorting for archived lessons if explicitly selected", () => {
    const sort = makeSortList("oldest");
    const sorted = sort(mockArchivedLessons, true);
    assert.equal(sorted[0].id, "arch-old");    // April at top
    assert.equal(sorted[2].id, "arch-recent"); // Yesterday at bottom
  });

  it("respects 'newest' sorting for archived lessons", () => {
    const sort = makeSortList("newest");
    const sorted = sort(mockArchivedLessons, true);
    assert.equal(sorted[0].id, "arch-recent"); // Yesterday at top
    assert.equal(sorted[2].id, "arch-old");    // April at bottom
  });
});
