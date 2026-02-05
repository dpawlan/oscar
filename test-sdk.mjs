import { query } from '@anthropic-ai/claude-agent-sdk';

async function test() {
  console.log('Starting SDK test...');

  try {
    for await (const message of query({
      prompt: 'Say hello',
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are a helpful assistant.',
        maxTurns: 1,
      },
    })) {
      console.log('Message:', JSON.stringify(message, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
