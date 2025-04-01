import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Replicate from 'replicate'
import dedent from 'dedent'
import YAML from 'yaml'

const app = new Hono<{ Bindings: Env }>();
app.use(cors());

interface Env {
  REPLICATE_API_TOKEN: string
}

app.get('/:owner/:modelName', async (c) => {
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


  ## Classification

  Based on the information above, please classify the model into one of the following categories:

  - text-to-text
  - text-to-image
  - image-to-text
  - image-to-image
  - audio-to-text
  - text-to-audio
  - other

  ## Classification output format

  Return a JSON object with the following fields:

  - summary: A short summary of what the model does in 15 words or less.
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
    const claudeResponse = await replicate.run("anthropic/claude-3.7-sonnet", {input: { prompt }})
    console.log(claudeResponse)
    classification = JSON.parse(claudeResponse)
  } catch (e) {
    console.error(e)
    return c.json({
      error: 'Failed to classify model'
    }, 500)
  }

  return c.json({
    classification,
    prompt,
    model,
    examples
  })
})

export default app;


const getInputSchema = (model: any) => {
  return model.latest_version?.openapi_schema?.components?.schemas?.Input?.properties
}

const getInputSchemaSummary = (model: any) => {
  const inputSchema = getInputSchema(model)

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
