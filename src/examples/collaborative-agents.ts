import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import axios from "axios";
import "dotenv/config";
import { z } from "zod";
import { Network, TextAgent } from "../index";

// Data Fetching Agent - Specializes in retrieving external data
const dataFetchAgent = new TextAgent({
  model: openai("gpt-4o-2024-11-20"),
  system:
    "You are a data fetching agent that retrieves and processes external information.",
  tools: {
    fetchWeather: tool({
      description: "Fetches current weather data for a location",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => {
        // First get coordinates for the city
        const geocodeResponse = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            city
          )}&count=1`
        );
        const { latitude, longitude } = geocodeResponse.data.results[0];

        // Then get weather using coordinates
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        );
        return response.data;
      },
    }),
    fetchNews: tool({
      description: "Fetches latest news articles about a topic",
      parameters: z.object({ topic: z.string() }),
      execute: async ({ topic }) => {
        const response = await axios.get(
          `https://api.spaceflightnewsapi.net/v4/articles/?title_contains=${encodeURIComponent(
            topic
          )}&limit=5`
        );
        return response.data.results;
      },
    }),
  },
});

// Analysis Agent - Processes and analyzes data
const analysisAgent = new TextAgent({
  model: openai("gpt-4o-2024-11-20"),
  system:
    "You are an analysis agent that processes and derives insights from data.",
  tools: {
    analyzeData: tool({
      description: "Analyzes provided data and generates insights",
      parameters: z.object({
        data: z.any(),
        context: z.string(),
      }),
      execute: async ({ data, context }) => {
        const { text } = await generateText({
          model: openai("gpt-4o-2024-11-20"),
          prompt: `Analyze this data in the context of ${context}:\n${JSON.stringify(
            data
          )}`,
          maxTokens: 500,
        });
        return text;
      },
    }),
  },
});

// Summary Agent - Creates final summaries and recommendations
const summaryAgent = new TextAgent({
  model: openai("gpt-4o-2024-11-20"),
  system:
    "You are a summary agent that creates concise, actionable summaries from analyzed information.",
  tools: {
    createSummary: tool({
      description: "Creates a summary with recommendations",
      parameters: z.object({
        analyses: z.array(z.string()),
        format: z.enum(["brief", "detailed"]),
      }),
      execute: async ({ analyses, format }) => {
        const { text } = await generateText({
          model: openai("gpt-4o-2024-11-20"),
          prompt: `Create a ${format} summary and recommendations based on these analyses:\n${analyses.join(
            "\n"
          )}`,
          maxTokens: 300,
        });
        return text;
      },
    }),
  },
});

// Example usage of the collaborative network
async function main() {
  try {
    const network = new Network({
      defaultModel: openai("gpt-4o-2024-11-20"),
    });

    // Register all agents
    network.registerAgent("dataFetcher", dataFetchAgent);
    network.registerAgent("analyzer", analysisAgent);
    network.registerAgent("summarizer", summaryAgent);

    // Example task: Analyze weather and news for travel recommendations
    const city = "London";
    const topic = "travel to " + city;
    const toolResultsMapper = (result: Map<string, any>) => {
      return Array.from(result.entries())
        .map(([key, value]) => JSON.stringify(value.toolResults))
        .join("\n");
    };

    console.log("Fetching weather and news for", city, topic);
    const result = await network.execute(
      `Fetch weather for ${city} and news about ${topic}`
    );

    console.log("Analyzing weather and news for", city, topic);
    console.log(`Analyze the weather and news data to determine travel conditions
    Input: ${toolResultsMapper(result)}
    `);

    const result2 = await network.execute(
      `Analyze the weather and news data to determine travel conditions

      Input: ${toolResultsMapper(result)}
      `
    );

    console.log("Creating final summary for", city, topic);
    const result3 = await network.execute(
      `Create a detailed summary of travel recommendations
      
      Input: ${toolResultsMapper(result2)}
      `
    );
    console.log(toolResultsMapper(result3));
  } catch (error) {
    console.error("Error in collaborative network:", error);
  }
}

(async () => {
  await main();
})();
