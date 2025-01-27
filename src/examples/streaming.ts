import { openai } from "@ai-sdk/openai";
import "dotenv/config";
import { z } from "zod";
import { Network, ObjectAgent } from "..";

const formBuilderAgent = new ObjectAgent({
  system: "You are a form builder agent.",
  schema: z.object({
    name: z.string(),
    fields: z.array(
      z.object({
        question: z.string(),
        type: z.enum(["radio", "text", "multiselect", "file"]),
        defaultValue: z.string().optional(),
        options: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
    ),
  }),
});

// Example usage
(async () => {
  const network = new Network({
    defaultModel: openai("gpt-4o-2024-11-20"),
  });

  // Register agents
  network.registerAgent("formBuilder", formBuilderAgent);

  // Single agent execution streaming
  await network.execute("Build a form for a PHQ-9 survey.", {
    multipleAgents: true,
    stream: true,
    streamCallback: (textPart) => {
      process.stdout.write(textPart);
    },
  });
})();
