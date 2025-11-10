import { defineConfig } from "tinacms";
import { BlogCollection } from "./collections/blog";
import { MusicCollection } from "./collections/music";
import { DevCollection } from "./collections/dev";
import { GlobalConfigCollection } from "./collections/global-config";
import { PageCollection } from "./collections/page";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,

  // Get this from tina.io (optional - only needed for TinaCloud)
  clientId: process.env.PUBLIC_TINA_CLIENT_ID,
  // Get this from tina.io (optional - only needed for TinaCloud)
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "images",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      BlogCollection,
      MusicCollection,
      DevCollection,
      PageCollection,
      GlobalConfigCollection,
    ],
  },
});
