import dedent from 'dedent';
import YAML from 'yaml';
import { TASKS_DATA } from '@huggingface/tasks';
import { marked } from 'marked';

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

export function generatePrompt({
  model,
  examples,
  getInputSchemaSummary,
  getOutputSchema
}: {
  model: ReplicateModel,
  examples: ModelExample[],
  getInputSchemaSummary: (model: ReplicateModel) => string,
  getOutputSchema: (model: ReplicateModel) => string
}): string {
  return dedent`
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

  ${examples.map((example, index) => dedent`
    Example ${index + 1}:
    
    Input: ${YAML.stringify(example.input)}

    Output: ${JSON.stringify(example.output, null, 2).slice(0, 3000)}
  `).join('\n\n---------------\n\n')}


  ## Task Classification

  Based on the information above, please classify the model into one of the following tasks:

  ${Object.keys(TASKS_DATA).map((taskName) => {
    const key = taskName as keyof typeof TASKS_DATA;
    return dedent`
      - ${key}: ${TASKS_DATA[key]?.summary}
    `;
  }).join('\n')}

  ## Use cases

  Based on the information above, please provide a list of use cases for the model.

  - Denoise audio recordings
  - Colorize black-and-white photos
  - Summarize long documents
  - Transcribe podcasts to text
  - Detect objects in images
  - Generate text-to-speech audio
  - Add captions to videos
  - Stitch multiple videos together
  - Animate a still photo
  - Convert sketches to realistic images
  - Generate music from text prompts
  - Create 3D models from 2D images
  - Translate spoken language in real time
  - Convert handwriting to digital text
  - Classify email as spam or not spam
  - Detect plagiarism in text
  - Create art from a style prompt
  - Identify plants from photos
  - Diagnose medical images (like X-rays)
  - Predict customer churn
  - Generate resumes from a set of achievements
  - Fix blurry images
  - Identify key moments in video footage

  ## Blog post

  Include a blog post in markdown format.

  The post should include:

  - A short introduction to the model
  - A link to the model with a fully qualified name, e.g. https://replicate.com/{owner}/{name}
  - Images or videos from the example model outputs. Use <video> tags for videos. Wrap image and video tags with links to the prediction page, e.g. https://replicate.com/p/{prediction_id}
  - A mentiong of the model author
  - The date the model was created
  - A list of example use cases for the model
  - Sample code for running it with \`replicate.run\` using the JavaScript client. Be sure to use \`{owner}/{name}\` as the model name format. Be sure to close the \`\`\` code block.
  - Do not mention pricing.
  - Do not include an H1 header (#) -- that will be generated from the frontmatter.

  Blog post should have YAML frontmatter with the following fields:

  ---
  title: Title goes here
  authors:
    - blog-o-matic
  intro: Short intro goes here
  publishedAt: YYYY-MM-DD
  ---

  The post should follow these style guidelines:

  - Don't start the post with sayings like "We're excited to announce that..."
  - Talk like a human, not a corporation.
  - Avoid corporate and startup jargon.
  - Be clear, direct, and conversational.
  - Don't oversell or exaggerate; be specific.
  - Use humor, but make sure it's inclusive and accessible.
  - Use simple, common words (e.g., “improve” not “revolutionize,” “use” not “leverage”).
  - Avoid acronyms unless commonly understood (e.g., AI, API).
  - Use active voice
  - Don't assume specialist knowledge.
  - Use gender-neutral and inclusive language.
  - Avoid ableist and exclusionary terms (“crazy,” “lame,” etc.).
  - Avoid words like “easy,” “simply,” or “just do X.”
  - Use sentence case, not Title Case.
  - Use bold only for UI elements, not emphasis.
  - Use inline code formatting for filenames and commands.
  - Spell out large numbers (e.g., “7 billion parameters”).
  - Use ISO 8601 dates (YYYY-MM-DD) or human-readable formats (e.g., “October 24, 2024”).
  - Use American English spelling and grammar (e.g., “color” not “colour”).
  - Refer to models as the user's, not Replicate's.
  - Use “Replicate,” not “Replicate AI” or “Replicate.com.”
  - Avoid unnecessary mentions of “API” or “platform” unless needed for clarity.
  - Be honest. Don't hide reality.
  - Minimize exclamation points.

  ## Output format

  Return a JSON object with the following fields:

  - summary: A short summary of what the model does in 10 words or less. This should not be a sales pitch.
  - inputTypes: An array of the types of inputs the model accepts, like "text", "image", "audio", etc.
  - outputTypes: An array of the types of outputs the model returns, like "text", "image", "audio", etc.
  - task: The task the model performs. This should be one of the Hugging Face task names.
  - useCases: An array of 10 use cases for the model. Each one should be a single sentence of 8 words or less.
  - blogPost: A blog post announcing  the model

  Do not include any other text in your response.
  Do not explain your reasoning.
  Just return the JSON object.
  No code fencing.
  No markdown.
  No backticks.
  No triple backticks.
  No code blocks.
  `.trim();
} 