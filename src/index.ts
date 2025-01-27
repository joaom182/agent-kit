import { openai } from "@ai-sdk/openai";
import {
  generateObject,
  generateText,
  LanguageModel,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";

type GenerateTextOptions = Parameters<typeof generateText>[0];
type GenerateObjectOptions = Parameters<typeof generateObject>[0] & {
  schema: z.Schema<any>;
};

type GenerateTextResultType = ReturnType<typeof generateText>;
type StreamTextResultType = ReturnType<typeof streamText>;
type GenerateObjectResultType = ReturnType<typeof generateObject>;
type StreamObjectResultType = ReturnType<typeof streamObject>;

// Base class for all agents
abstract class Agent<T extends { prompt?: string; model?: LanguageModel }> {
  public parameters: Partial<T>;

  constructor(parameters: Partial<T> = {} as Partial<T>) {
    this.parameters = parameters;
  }

  setParameters(parameters: any): void {
    this.parameters = { ...this.parameters, ...parameters };
  }

  abstract execute(): Promise<any>;
  abstract stream(): any;
}

// Text generation agent
class TextAgent extends Agent<GenerateTextOptions> {
  constructor(parameters: Partial<GenerateTextOptions> = {}) {
    super(parameters);
  }

  async execute(): Promise<GenerateTextResultType> {
    const { prompt, model } = this.parameters;
    if (!prompt || !model) {
      throw new Error("Both prompt and model must be provided");
    }

    return generateText(this.parameters as GenerateTextOptions);
  }

  stream(): StreamTextResultType {
    const { prompt, model } = this.parameters;
    if (!prompt || !model) {
      throw new Error("Both prompt and model must be provided");
    }
    return streamText(this.parameters as GenerateTextOptions);
  }
}

// Object generation agent
class ObjectAgent extends Agent<GenerateObjectOptions> {
  constructor(parameters: Partial<GenerateObjectOptions> = {}) {
    super(parameters);
  }

  validateParameters(): void {
    const { prompt, schema, model } = this.parameters;
    if (!prompt || !schema || !model) {
      throw new Error("Both prompt, schema and model must be provided");
    }
  }

  async execute(): Promise<GenerateObjectResultType> {
    this.validateParameters();
    return generateObject(this.parameters as GenerateObjectOptions);
  }

  stream(): StreamObjectResultType {
    this.validateParameters();
    return streamObject(this.parameters as GenerateObjectOptions);
  }
}

// Network class to manage agents and inference
class Network {
  private agents: Map<string, Agent<any>> = new Map();
  private parameters: {
    defaultModel?: LanguageModel;
  };

  constructor(parameters: { defaultModel?: LanguageModel } = {}) {
    this.parameters = parameters;
  }

  registerAgent(name: string, agent: Agent<any>): void {
    this.agents.set(name, agent);
  }

  private async inferAgents(
    prompt: string,
    multipleAgents: boolean
  ): Promise<string[]> {
    const inferencePrompt = `
      You are tasked with determining which agents should be used to handle a user's request.
      Available agents: ${Array.from(this.agents.keys()).join(", ")}.
      User prompt: "${prompt}"
      Should multiple agents be used? ${multipleAgents ? "Yes" : "No"}.
      Return the agent names that should be used as a comma-separated list.
    `;

    // Use text generation for agent inference
    const result = await generateText({
      model: this.parameters?.defaultModel || openai("gpt-4o-2024-11-20"),
      prompt: inferencePrompt,
      maxTokens: 50,
    });

    // Get the text content from the result
    const text = await result.text;
    return text
      .trim()
      .split(",")
      .map((name) => name.trim());
  }

  async execute(
    prompt: string,
    params: {
      multipleAgents?: boolean;
      stream?: boolean;
      streamCallback?: (text: string) => void;
    } = {}
  ): Promise<Map<string, any>> {
    const { multipleAgents = false, stream = false, streamCallback } = params;

    const agentNames = await this.inferAgents(prompt, multipleAgents);

    if (agentNames.length === 0) {
      throw new Error("No applicable agents found for the given prompt.");
    }

    const result = new Map<string, any>();

    const executeAgent = async (agentName: string) => {
      const agent = this.agents.get(agentName);
      if (!agent) throw new Error(`Agent "${agentName}" not registered.`);

      agent.setParameters({
        prompt,
        model: agent.parameters.model || this.parameters.defaultModel,
      });

      if (stream) {
        const { textStream } = agent.stream();
        for await (const textPart of textStream) {
          streamCallback?.(textPart);
        }
      } else {
        const output = await agent.execute();
        result.set(agentName, output);
      }
    };

    if (!multipleAgents) {
      await executeAgent(agentNames[0]);
    } else {
      const executionPromises = agentNames.map(executeAgent);
      await Promise.all(executionPromises);
    }

    return result;
  }
}

export { Network, ObjectAgent, TextAgent };
