import { defineCollection, z } from "astro:content";
import client from "../tina/__generated__/client";

const blog = defineCollection({
  loader: async () => {
    const postsResponse = await client.queries.blogConnection();

    // Map Tina posts to the correct format for Astro
    return postsResponse.data.blogConnection.edges
      ?.filter((post) => !!post)
      .map((post) => {
        const node = post?.node;

        return {
          ...node,
          id: node?._sys.relativePath.replace(/\.mdx?$/, ""), // Generate clean URLs
          tinaInfo: node?._sys, // Include Tina system info if needed
        };
      });
  },
  schema: z.object({
    tinaInfo: z.object({
      filename: z.string(),
      basename: z.string(),
      path: z.string(),
      relativePath: z.string(),
    }),
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().nullish(),
  }),
});

const music = defineCollection({
  loader: async () => {
    const response = await client.queries.musicConnection();
    return response.data.musicConnection.edges
      ?.filter((item) => !!item)
      .map((item) => {
        const node = item?.node;
        return {
          ...node,
          id: node?._sys.relativePath.replace(/\.mdx?$/, ""),
          tinaInfo: node?._sys,
        };
      });
  },
  schema: z.object({
    tinaInfo: z.object({
      filename: z.string(),
      basename: z.string(),
      path: z.string(),
      relativePath: z.string(),
    }),
    title: z.string(),
    description: z.string().nullish(),
    genre: z.array(z.string()).nullish(),
    releaseDate: z.coerce.date().nullish(),
    coverImage: z.string().nullish(),
    featured: z.boolean().nullish(),
    links: z.array(z.object({
      platform: z.string().nullish(),
      url: z.string().nullish(),
    })).nullish(),
  }),
});

const dev = defineCollection({
  loader: async () => {
    const response = await client.queries.devConnection();
    return response.data.devConnection.edges
      ?.filter((item) => !!item)
      .map((item) => {
        const node = item?.node;
        return {
          ...node,
          id: node?._sys.relativePath.replace(/\.mdx?$/, ""),
          tinaInfo: node?._sys,
        };
      });
  },
  schema: z.object({
    tinaInfo: z.object({
      filename: z.string(),
      basename: z.string(),
      path: z.string(),
      relativePath: z.string(),
    }),
    title: z.string(),
    description: z.string().nullish(),
    tech: z.array(z.string()).nullish(),
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
    coverImage: z.string().nullish(),
    githubUrl: z.string().nullish(),
    liveUrl: z.string().nullish(),
    status: z.string().nullish(),
    featured: z.boolean().nullish(),
    order: z.number().nullish(),
  }),
});

const page = defineCollection({
  loader: async () => {
    const postsResponse = await client.queries.pageConnection();

    // Map Tina posts to the correct format for Astro
    return postsResponse.data.pageConnection.edges
      ?.filter((p) => !!p)
      .map((p) => {
        const node = p?.node;

        return {
          ...node,
          id: node?._sys.relativePath.replace(/\.mdx?$/, ""), // Generate clean URLs
          tinaInfo: node?._sys, // Include Tina system info if needed
        };
      });
  },
  schema: z.object({
    tinaInfo: z.object({
      filename: z.string(),
      basename: z.string(),
      path: z.string(),
      relativePath: z.string(),
    }),
    seoTitle: z.string(),
    body: z.any(),
  }),
})
export const collections = { blog, music, dev, page };
