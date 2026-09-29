import { CommandForm, type Field } from "./command-form";
import type { Category, FeedbackPost } from "@/modules/feedback/types";
export function PostEditor({
  categories,
  post,
  staff = false,
}: {
  categories: Category[];
  post?: FeedbackPost;
  staff?: boolean;
}) {
  const fields: Field[] = [
    { name: "title", label: "Idea title", min: 4, max: 120 },
    {
      name: "body",
      label: "Idea description",
      type: "textarea",
      min: 10,
      max: 4000,
    },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
  ];
  if (!post && staff)
    fields.push({
      name: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "internal", label: "Internal" },
      ],
    });
  const initial: Record<string, string | number | boolean> = post
    ? {
        action: "editPost",
        postId: post.id,
        version: post.version,
        title: post.title,
        body: post.body,
        categoryId: post.categoryId,
        visibility: post.visibility,
      }
    : {
        action: "createPost",
        title: "",
        body: "",
        categoryId: categories[0]?.id || "",
        visibility: "public",
      };
  return (
    <CommandForm
      initial={initial}
      fields={fields}
      label={post ? "Save idea" : "Submit idea"}
    />
  );
}
