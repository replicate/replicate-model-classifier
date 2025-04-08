import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Replicate from 'replicate'
import dedent from 'dedent'
import YAML from 'yaml'
import { TASKS_DATA } from '@huggingface/tasks'
import { marked } from 'marked';

const taskNames = Object.keys(TASKS_DATA)

import Anthropic from '@anthropic-ai/sdk';
const app = new Hono<{ Bindings: Env }>();
app.use(cors());

interface Env {
  REPLICATE_API_TOKEN: string
  ANTHROPIC_API_KEY: string
  CLASSIFICATIONS_CACHE: KVNamespace
}

interface CachedData {
  classification: {
    summary: string
    inputTypes: string[]
    outputTypes: string[]
    task: string
    taskSummary: string
  }
  prompt: string
  claudeResponse: {
    content: Array<{
      text: string
    }>
  }
  model: {
    name: string
    description: string
    owner: string
    latest_version: {
      openapi_schema: {
        components: {
          schemas: {
            Input: {
              properties: Record<string, {
                description: string
                type: string
              }>
            }
            Output: {
              properties?: Record<string, unknown>
            }
          }
        }
      }
    }
  }
  examples: Array<{
    input: Record<string, unknown>
    output: unknown
  }>
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <script>hljs.highlightAll();</script>
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
      ${marked.parse(readme, {
        highlight: (code, lang) => {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return code;
        }
      })}
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

app.post('/api/cache/purge', async (c) => {
  try {
    let totalDeleted = 0
    let cursor: string | undefined
    
    do {
      // List keys with pagination
      const keys = await c.env.CLASSIFICATIONS_CACHE.list({ cursor })
      
      // Delete each key in the current page
      const deletePromises = keys.keys.map(key => 
        c.env.CLASSIFICATIONS_CACHE.delete(key.name)
      )
      
      await Promise.all(deletePromises)
      totalDeleted += keys.keys.length
      
      // Get the cursor for the next page
      cursor = keys.list_complete ? undefined : keys.cursor
    } while (cursor)
    
    return c.json({
      success: true,
      message: `Successfully purged ${totalDeleted} entries from cache`
    })
  } catch (error) {
    console.error('Error purging cache:', error)
    return c.json({
      success: false,
      error: 'Failed to purge cache'
    }, 500)
  }
})

app.get('/api/classifications', async (c) => {
  const keys = await c.env.CLASSIFICATIONS_CACHE.list()
  const classifications = await Promise.all(keys.keys.map(async key => {
    const data = await c.env.CLASSIFICATIONS_CACHE.get<CachedData>(key.name, 'json')
    return [key.name, data?.classification]
  }))
  
  const result = Object.fromEntries(classifications)
  
  // Filter by task if task query param is provided
  const task = c.req.query('task')
  if (task) {
    return c.json(Object.fromEntries(
      Object.entries(result).filter(([_, classification]) => 
        classification?.task === task
      )
    ))
  }
  
  return c.json(result)
})

app.get('/api/models/:owner/:modelName', async (c) => {
  const { owner, modelName } = c.req.param()
  const cacheKey = `${owner}/${modelName}`
  
  // Check cache first, unless force refresh is requested
  if (!c.req.query('force')) {
    const cachedData = await c.env.CLASSIFICATIONS_CACHE.get<CachedData>(cacheKey, 'json')
    if (cachedData) {
      console.log('Cache hit for', cacheKey)
      // If debug mode is requested, return full data
      if (c.req.query('debug')) {
        return c.json(cachedData, 200, {
          'X-Cache': 'HIT'
        })
      }
      // If prompt is requested, return the prompt used
      if (c.req.query('prompt')) {
        return c.text(cachedData.prompt, 200, {
          'X-Cache': 'HIT'
        })
      }
      // Return normal response
      return c.json({
        model: cacheKey,
        classification: cachedData.classification
      }, 200, {
        'X-Cache': 'HIT'
      })
    }
  }
  console.log('Cache miss for', cacheKey)

  const replicate = new Replicate({auth: c.env.REPLICATE_API_TOKEN})
  const model = await replicate.models.get(owner, modelName)

  const examplesResponse = await fetch(`https://api.replicate.com/v1/models/${owner}/${modelName}/examples`, {
    headers: {
      'Authorization': `Bearer ${c.env.REPLICATE_API_TOKEN}`
    }
  });
  const examples = (await examplesResponse.json()).results;

  const prompt = dedent`
  You are a helpful assistant that classifies AI models and returns JSON descriptions.

  Here's the model to classify:

  ## Basic model info
  
  Model name: ${model.name}
  Model description: ${model.description}

  ## Model inputs

  ${getInputSchemaSummary(model)}

  ## Model output schema

  ${getOutputSchema(model)}

  If the input or output schema includes a format of URI, it is referring to a file.

  ## Example inputs and outputs

  Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

  ${examples.map((example: any, index: number) => dedent`
    Example ${index + 1}:
    
    Input: ${YAML.stringify(example.input)}

    Output: ${JSON.stringify(example.output, null, 2).slice(0, 3000)}
  `).join('\n\n---------------\n\n')}


  ## Task Classification

  Based on the information above, please classify the model into one of the following tasks:

  ${Object.keys(TASKS_DATA).map((taskName) => dedent`
    - ${taskName}: ${TASKS_DATA[taskName]?.summary}
  `).join('\n')}

  ## Output format

  Return a JSON object with the following fields:

  - summary: A short summary of what the model does in 10 words or less. This should not be a sales pitch.
  - inputTypes: An array of the types of inputs the model accepts, like "text", "image", "audio", etc.
  - outputTypes: An array of the types of outputs the model returns, like "text", "image", "audio", etc.
  - task: The task the model performs. This should be one of the Hugging Face task names.

  Do not include any other text in your response.
  Do not explain your reasoning.
  Just return the JSON object.
  No code fencing.
  No markdown.
  No backticks.
  No triple backticks.
  No code blocks.
`.trim()

  if (c.req.query('prompt')) {
    return c.text(prompt)
  }

  let classification: any
  let claudeResponse: any
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
    classification = JSON.parse(claudeResponse.content[0].text);
    
    classification.taskSummary = TASKS_DATA[classification.task]?.summary

    // Prepare data for caching
    const cacheData = {
      classification,
      prompt,
      claudeResponse,
      model,
      examples
    }

    // Cache the data forever (no expirationTtl)
    await c.env.CLASSIFICATIONS_CACHE.put(cacheKey, JSON.stringify(cacheData))
  } catch (e) {
    console.error(e)
    return c.json({
      error: 'Failed to classify model',
      message: e.message
    }, 500)
  }

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
  })
})

export default app;

const getInputSchemaSummary = (model: any) => {
  const inputSchema = model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties

  return Object.keys(inputSchema).map((key) => {
    const description = inputSchema[key].description
    const type = inputSchema[key].type
    return `- ${key}: ${description} (${type})`
  }).join('\n')
}

const getOutputSchema = (model: any) => {
  const schema = model.latest_version?.openapi_schema?.components?.schemas?.Output

  if (schema.properties) {
    return JSON.stringify(schema.properties, null, 2)
  }

  return JSON.stringify(schema, null, 2)
}