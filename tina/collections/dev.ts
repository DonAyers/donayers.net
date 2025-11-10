import type { Collection } from "tinacms";

export const DevCollection: Collection = {
  name: "dev",
  label: "Dev Projects",
  path: "src/content/dev",
  format: "mdx",
  ui: {
    router({ document }) {
      return `/dev/${document._sys.filename}`;
    },
  },
  fields: [
    {
      type: "string",
      name: "title",
      label: "Project Title",
      isTitle: true,
      required: true,
    },
    {
      name: "description",
      label: "Short Description",
      type: "string",
    },
    {
      name: "tech",
      label: "Technologies",
      type: "string",
      list: true,
      options: [
        "React",
        "TypeScript",
        "Next.js",
        "Astro",
        "Node.js",
        "TailwindCSS",
        "GraphQL",
        "PostgreSQL",
        "MongoDB",
        "AWS",
        "Vercel",
        "Docker",
        "Other"
      ],
    },
    {
      name: "startDate",
      label: "Start Date",
      type: "datetime",
    },
    {
      name: "endDate",
      label: "End Date (optional)",
      type: "datetime",
    },
    {
      name: "coverImage",
      label: "Project Screenshot",
      type: "image",
    },
    {
      name: "githubUrl",
      label: "GitHub Repository",
      type: "string",
    },
    {
      name: "liveUrl",
      label: "Live Demo URL",
      type: "string",
    },
    {
      name: "status",
      label: "Project Status",
      type: "string",
      options: ["In Progress", "Completed", "Archived", "Ongoing"],
    },
    {
      name: "featured",
      label: "Featured Project",
      type: "boolean",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Project Details",
      isBody: true,
    },
  ],
};
