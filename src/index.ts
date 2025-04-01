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
}

app.get('/', async (c) => {
  const readme = await fetch('https://raw.githubusercontent.com/zeke/replicate-model-classifier/main/README.md').then(res => res.text())
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

app.get('/api/models/:owner/:modelName', async (c) => {
  const { owner, modelName } = c.req.param()
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

    Output: ${JSON.stringify(example.output, null, 2)}
  `).join('\n\n---------------\n\n')}


  ## Modalities

  Based on the information above, please classify the model into one of the following modalites:

  - text-to-text
  - text-to-image
  - image-to-text
  - image-to-image
  - audio-to-text
  - text-to-audio
  - etc

  ## Tasks

  Based on the information above, please classify the model into one of the following tasks:

  ${Object.keys(TASKS_DATA).map((taskName) => dedent`
    - ${taskName}: ${TASKS_DATA[taskName].summary}
  `).join('\n')}

  ## Classification output format

  Return a JSON object with the following fields:

  - summary: A short summary of what the model does in 10 words or less. This should not be a sales pitch.
  - task: The task the model performs. This should be one of the Hugging Face task names.
  - modality: The modality of the model. This should be in the format "x-to-y" where x and y are the input and output modalities, like "text-to-image", "image-to-text", "image-to-video", "text-to-audio", etc.

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
  try {
    const anthropic = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY
    });
    const claudeResponse = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024
    });
    console.log(claudeResponse.content[0].text);
    classification = JSON.parse(claudeResponse.content[0].text);
  } catch (e) {
    console.error(e)
    return c.json({
      error: 'Failed to classify model'
    }, 500)
  }

  if (c.req.query('classification')) {
    return c.json(classification)
  }

  return c.json({
    classification,
    prompt,
    model,
    examples
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