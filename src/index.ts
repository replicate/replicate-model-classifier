import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Replicate from 'replicate'
import dedent from 'dedent'
import YAML from 'yaml'
import { TASKS_DATA } from '@huggingface/tasks'
import { marked } from 'marked';
import { drizzle } from 'drizzle-orm/d1';
import { modelClassifications } from './schema';
import { eq, sql } from 'drizzle-orm';
import type { TaskData } from '@huggingface/tasks';

const taskNames = Object.keys(TASKS_DATA)

import Anthropic from '@anthropic-ai/sdk';
import { generatePrompt } from './prompt';
const app = new Hono<{ Bindings: Env }>();
app.use(cors());

interface Env {
  REPLICATE_API_TOKEN: string
  ANTHROPIC_API_KEY: string
  DB: D1Database
}

interface ReplicateModel {
  name: string;
  description: string;
  latest_version?: {
    openapi_schema?: {
      components?: {
        schemas?: {
          Input?: {
            properties: Record<string, {
              description?: string;
              type?: string;
            }>;
          };
          Output?: {
            properties?: Record<string, unknown>;
          };
        };
      };
    };
  };
}

interface ModelExample {
  input: Record<string, unknown>;
  output: unknown;
}

interface Classification {
  summary: string;
  inputTypes: string[];
  outputTypes: string[];
  task: keyof typeof TASKS_DATA;
  useCases: string[];
  taskSummary?: string;
}

app.get('/', async (c) => {
  // Since Cloudflare Workers don't have access to the local filesystem,
  // we need to fetch the README.md content from GitHub directly
  const rawReadmeUrl = 'https://raw.githubusercontent.com/zeke/replicate-model-classifier/refs/heads/main/README.md'
  const readme = await fetch(rawReadmeUrl).then(res => res.text())
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Replicate Model Classifier</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
      <style>
        .markdown-body {
          box-sizing: border-box;
          min-width: 200px;
          max-width: 980px;
          margin: 0 auto;
          padding: 45px;
        }
      </style>
    </head>
    <body class="markdown-body">
      ${marked.parse(readme)}
    </body>
    </html>
  `
  return c.html(html)
})

app.get('/api/tasks', async (c) => {
  return c.json(TASKS_DATA)
})

app.get('/api/taskNames', async (c) => {
  return c.json(taskNames)
})

app.get('/api/classifications', async (c) => {
  const db = drizzle(c.env.DB)
  const allClassifications = await db.select().from(modelClassifications).all()
  
  return c.json({
    classifications: allClassifications.map(row => ({
      model: row.modelKey,
      classification: JSON.parse(row.classification),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  })
})

app.get('/api/cache/stats', async (c) => {
  const db = drizzle(c.env.DB)
  
  const total = await db.select({ count: sql<number>`count(*)` })
    .from(modelClassifications)
    .get()
  
  const oldest = await db.select()
    .from(modelClassifications)
    .orderBy(modelClassifications.createdAt)
    .limit(1)
    .get()
  
  const newest = await db.select()
    .from(modelClassifications)
    .orderBy(modelClassifications.createdAt, 'desc')
    .limit(1)
    .get()
  
  return c.json({
    total: total?.count || 0,
    oldest: oldest ? {
      model: oldest.modelKey,
      createdAt: oldest.createdAt
    } : null,
    newest: newest ? {
      model: newest.modelKey,
      createdAt: newest.createdAt
    } : null
  })
})

app.get('/api/models/:owner/:modelName', async (c) => {
  const { owner, modelName } = c.req.param()
  const cacheKey = `${owner}/${modelName}`
  
  const db = drizzle(c.env.DB)

  const replicate = new Replicate({auth: c.env.REPLICATE_API_TOKEN})
  const model = await replicate.models.get(owner, modelName) as ReplicateModel

  const examplesResponse = await fetch(`https://api.replicate.com/v1/models/${owner}/${modelName}/examples`, {
    headers: {
      'Authorization': `Bearer ${c.env.REPLICATE_API_TOKEN}`
    }
  });
  const examples = (await examplesResponse.json() as { results: ModelExample[] }).results;

  const prompt = generatePrompt({
    model,
    examples,
    getInputSchemaSummary,
    getOutputSchema
  });

  if (c.req.query('prompt')) {
    return c.text(prompt)
  }
  
  // Try to get from cache first
  const cached = await db.select()
    .from(modelClassifications)
    .where(eq(modelClassifications.modelKey, cacheKey))
    .get()

  if (cached) {
    return c.json({
      model: cacheKey,
      classification: JSON.parse(cached.classification)
    }, 200, {
      'X-Cache': 'HIT',
      'Cache-Control': 'public, max-age=315360000' // 10 years
    })
  }

  let classification: Classification
  let claudeResponse: Anthropic.Message
  try {
    const anthropic = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY
    });
    claudeResponse = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024
    });
    console.log(claudeResponse.content[0].text);
    classification = JSON.parse(claudeResponse.content[0].text) as Classification;
    
    const taskData = TASKS_DATA[classification.task];
    classification.taskSummary = taskData?.summary;

    // Store in cache
    await db.insert(modelClassifications).values({
      modelKey: cacheKey,
      classification: JSON.stringify(classification),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Show everything
    if (c.req.query('debug')) {
      return c.json({
        classification,
        prompt,
        claudeResponse,
        model,
        examples
      })
    }

    return c.json({
      model: cacheKey,
      classification
    }, 200, {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=315360000' // 10 years
    })
  } catch (e) {
    console.error(e)
    if (e instanceof Error) {
      return c.json({
        error: 'Failed to classify model',
        message: e.message
      }, 500)
    }
    return c.json({
      error: 'Failed to classify model',
      message: 'An unknown error occurred'
    }, 500)
  }
})

export default app;

const getInputSchemaSummary = (model: ReplicateModel) => {
  const inputSchema = model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties

  return Object.keys(inputSchema || {}).map((key) => {
    const description = inputSchema?.[key].description
    const type = inputSchema?.[key].type
    return `- ${key}: ${description} (${type})`
  }).join('\n')
}

const getOutputSchema = (model: ReplicateModel) => {
  const schema = model.latest_version?.openapi_schema?.components?.schemas?.Output

  if (schema?.properties) {
    return JSON.stringify(schema.properties, null, 2)
  }

  return JSON.stringify(schema, null, 2)
}