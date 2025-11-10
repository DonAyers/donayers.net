import type { Collection } from "tinacms";

export const MusicCollection: Collection = {
  name: "music",
  label: "Music Projects",
  path: "src/content/music",
  format: "mdx",
  ui: {
    router({ document }) {
      return `/music/${document._sys.filename}`;
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
      label: "Description",
      type: "string",
    },
    {
      name: "genre",
      label: "Genre",
      type: "string",
      list: true,
      options: [
        "Electronic",
        "Ambient",
        "Synthwave",
        "Drum & Bass",
        "House",
        "Techno",
        "Experimental",
        "Other"
      ],
    },
    {
      name: "releaseDate",
      label: "Release Date",
      type: "datetime",
    },
    {
      name: "coverImage",
      label: "Cover Art",
      type: "image",
    },
    {
      name: "links",
      label: "Streaming Links",
      type: "object",
      list: true,
      fields: [
        {
          type: "string",
          name: "platform",
          label: "Platform",
          options: ["Spotify", "SoundCloud", "Bandcamp", "YouTube", "Apple Music", "Other"],
        },
        {
          type: "string",
          name: "url",
          label: "URL",
        },
      ],
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
