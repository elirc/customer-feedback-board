import { demoUsers } from "../modules/auth/demo-users";
import { statuses } from "../modules/feedback/database-schema";
import type { FeedbackDatabase } from "../modules/feedback/types";
export function fictionalSeed(): FeedbackDatabase {
  const time = "2026-09-09T00:00:00.000Z";
  return {
    revision: 1,
    users: demoUsers.map(({ id, name, role }) => ({ id, name, role })),
    categories: [
      {
        id: "category-workflow",
        name: "Workflow",
        description: "Make everyday work simpler.",
        displayOrder: 0,
      },
      {
        id: "category-accessibility",
        name: "Accessibility",
        description: "Help everyone use the product.",
        displayOrder: 1,
      },
    ],
    tags: [],
    posts: [
      {
        id: "post-keyboard",
        version: 1,
        title: "Keyboard shortcuts for common actions",
        slug: "keyboard-shortcuts",
        body: "Let us navigate the board and submit feedback without reaching for a mouse.",
        categoryId: "category-accessibility",
        tagIds: [],
        authorId: "fb-user-customer",
        status: "Open",
        visibility: "public",
        duplicateOfPostId: null,
        commentsLocked: false,
        hiddenAt: null,
        createdAt: time,
        updatedAt: time,
        lastActivityAt: time,
      },
      {
        id: "post-internal",
        version: 1,
        title: "Internal triage meeting notes",
        slug: "internal-triage",
        body: "Private staff discussion about how to review incoming feedback consistently.",
        categoryId: "category-workflow",
        tagIds: [],
        authorId: "fb-user-pm",
        status: "Under Review",
        visibility: "internal",
        duplicateOfPostId: null,
        commentsLocked: false,
        hiddenAt: null,
        createdAt: time,
        updatedAt: time,
        lastActivityAt: time,
      },
    ],
    votes: [],
    comments: [],
    follows: [],
    flags: [],
    moderationActions: [],
    mergeHistory: [],
    officialUpdates: [],
    internalNotes: [],
    notifications: [],
    settings: {
      version: 1,
      allowGuestBrowsing: true,
      allowVoting: true,
      portalMode: "mixed",
      statuses: [...statuses],
    },
  };
}
