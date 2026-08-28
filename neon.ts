import { defineConfig } from "@neon/config/v1";

/** Yatharth ERP uses Neon for Postgres only; file uploads use Vercel Blob. */
export default defineConfig({
  branch: (branch) => {
    if (branch.isDefault) {
      return {};
    }
    if (!branch.exists) {
      return { ttl: "7d" };
    }
    return {};
  },
});
