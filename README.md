# Agent-Kit Documentation

Agent-Kit is a flexible and powerful framework for building and managing AI agents. It provides a simple yet extensible way to work with language models for both text and structured data generation.

## Table of Contents
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Agents](#agents)
  - [TextAgent](#textagent)
  - [ObjectAgent](#objectagent)
- [Network](#network)
- [Examples](#examples)

## Installation

```bash
npm install agent-kit
```

## Core Concepts

Agent-Kit is built around three main concepts:
1. **Agents**: Individual AI components that handle specific tasks
2. **Network**: A manager class that orchestrates multiple agents
3. **Parameters**: Configuration options for agents and the network

## Quick Start

Here's a simple example to get you started:

```typescript
import { Network, TextAgent } from 'agent-kit';
import { openai } from '@ai-sdk/openai';

// Create a network with a default model
const network = new Network({
  defaultModel: openai('gpt-4-0125-preview')
});

// Create and register a text agent
const textAgent = new TextAgent();
network.registerAgent('text', textAgent);

// Execute the agent
const result = await network.execute('Write a short poem about AI');
```

## Agents

### TextAgent

TextAgent is used for generating free-form text responses.

```typescript
import { TextAgent } from 'agent-kit';
import { openai } from '@ai-sdk/openai';

const agent = new TextAgent({
  model: openai('gpt-4-0125-preview'),
  prompt: 'Explain quantum computing in simple terms'
});

// Get a complete response
const response = await agent.execute();

// Or stream the response
const stream = agent.stream();
for await (const chunk of stream.textStream) {
  console.log(chunk);
}
```

### ObjectAgent

ObjectAgent generates structured data according to a predefined schema.

```typescript
import { ObjectAgent } from 'agent-kit';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Define a schema for the output
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  interests: z.array(z.string())
});

const agent = new ObjectAgent({
  model: openai('gpt-4-0125-preview'),
  prompt: 'Generate a user profile',
  schema: userSchema
});

const result = await agent.execute();
```

## Network

The Network class provides a high-level interface for managing multiple agents:

```typescript
import { Network, TextAgent, ObjectAgent } from 'agent-kit';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Create a network
const network = new Network({
  defaultModel: openai('gpt-4-0125-preview')
});

// Register multiple agents
network.registerAgent('text', new TextAgent());
network.registerAgent('object', new ObjectAgent({
  schema: z.object({
    summary: z.string(),
    keywords: z.array(z.string())
  })
}));

// Execute with multiple agents
const results = await network.execute('Analyze this text', {
  multipleAgents: true
});
```

## Streaming

Agent-Kit supports streaming responses for real-time output:

```typescript
const network = new Network({
  defaultModel: openai('gpt-4-0125-preview')
});
network.registerAgent('text', new TextAgent());

await network.execute('Generate a story', {
  stream: true,
  streamCallback: (text) => {
    process.stdout.write(text);
  }
});
```

## Advanced Features

- **Agent Inference**: The network can automatically determine which agents to use based on the prompt
- **Parameter Management**: Easily configure and update agent parameters
- **Flexible Integration**: Works with various language models and can be extended for custom use cases

## Error Handling

The framework includes built-in error handling for common scenarios:

```typescript
try {
  const agent = new TextAgent();
  await agent.execute(); // Will throw error - missing required parameters
} catch (error) {
  console.error('Error:', error.message);
}
```

## Best Practices

1. Always provide a model parameter either at the Network or Agent level
2. Use schema validation with ObjectAgent to ensure structured output
3. Consider using streaming for long-running generations
4. Handle errors appropriately in production environments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 