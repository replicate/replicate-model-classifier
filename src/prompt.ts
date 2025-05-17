import dedent from 'dedent';
import YAML from 'yaml';
import { TASKS_DATA } from '@huggingface/tasks';
import { marked } from 'marked';

interface ReplicateModel {
  name: string;
  description: string;
  owner: string;
  url: string;
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

  ## Categories

  Categories are like tags that describe the model. 

  Examples:

  audio
  cinematic
  colorization
  denoising
  diffusion
  facial-landmark-detection
  image
  image
  inpainting
  object-segmentation
  ocr
  physics
  pose-estimation
  prompt-conditioning
  restoration
  speech-synthesis
  speech-to-text
  stabilization
  style-transfer
  super-resolution
  text
  typography
  upscaling
  vector
  video

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

  ## Output format

  Return a JSON object with the following fields:

  - summary: A short summary of what the model does in 10 words or less. This should not be a sales pitch.
  - inputTypes: An array of the types of inputs the model accepts, like "text", "image", "audio", "video", etc. These should not have names like "parameters", "inputs", "numeric_parameters", etc.
  - outputTypes: An array of the types of outputs the model returns, like "text", "image", "audio", "video", etc. These should not have names like "parameters", "outputs", "numeric_parameters", etc.
  - task: The task the model performs. This should be one of the Hugging Face task names.
  - categories: An array of categories the model belongs to. Generate 5 categories for the model.
  - useCases: An array of 10 use cases for the model. Each one should be a single sentence of 8 words or less.

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