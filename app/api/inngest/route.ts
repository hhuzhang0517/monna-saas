import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateMedia } from "@/inngest/functions/generate";
import { cleanupJobs } from "@/inngest/functions/cleanup";

export const { GET, POST, PUT } = serve({ 
  client: inngest, 
  functions: [generateMedia, cleanupJobs] 
});