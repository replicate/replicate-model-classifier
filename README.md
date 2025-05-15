# Replicate Model Classifier

An HTTP API to classify [Replicate models](https://replicate.com/explore) into [Hugging Face tasks](https://huggingface.co/tasks) using a language model.

Powered by:

- **Cloudflare Workers** for hosting the HTTP API
- **Hono** for authoring the HTTP API
- **Anthropic Claude 3.7 Sonnet** for model classification
- **Replicate API** for model metadata
- **Hugging Face Tasks** for model task metadata
- **Cloudflare D1** for caching classifications

Repository: https://github.com/zeke/replicate-model-classifier

## API

Base URL: `https://replicate-model-classifier.ziki.workers.dev/`

### Classify a model

```plaintext
GET /api/models/:owner/:model
```

Returns a JSON object with the model classification. Responses are cached.

**Cache Busting**

To force a fresh classification and bypass the cache, add the `bust=1` query parameter:

```plaintext
GET /api/models/:owner/:model?bust=1
```

This will skip the cache and trigger a new classification, updating the cache with the latest result.

Example:

- `/api/models/salesforce/blip?bust=1`

```json
{
    "model": "salesforce/blip",
    "classification": {
        "summary": "Generate image captions and answer questions about images",
        "inputTypes": ["image", "text"],
        "outputTypes": ["text"],
        "task": "visual-question-answering",
        "taskSummary": "Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions.",
        "useCases": [
          "Generate image captions for social media",
          "Answer questions about medical images",
          "Create alt text for accessibility",
          "Analyze security camera footage",
          "Describe artwork for museums",
          "Generate product descriptions",
          "Answer questions about diagrams",
          "Create image-based quizzes",
          "Analyze satellite imagery",
          "Describe scenes in videos"
        ]
    }
}
```

The response includes cache headers:
- `X-Cache`: Either "HIT" or "MISS" to indicate if the response came from cache
- `Cache-Control`: "public, max-age=315360000" (10 years)

Examples

- [/api/models/bytedance/sdxl-lightning-4step](https://replicate-model-classifier.ziki.workers.dev/api/models/bytedance/sdxl-lightning-4step)
- [/api/models/meta/meta-llama-3-8b-instruct](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct)
- [/api/models/black-forest-labs/flux-schnell](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell)
- [/api/models/salesforce/blip](https://replicate-model-classifier.ziki.workers.dev/api/models/salesforce/blip)
- [/api/models/meta/meta-llama-3-70b-instruct](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-70b-instruct)
- [/api/models/stability-ai/stable-diffusion](https://replicate-model-classifier.ziki.workers.dev/api/models/stability-ai/stable-diffusion)
- [/api/models/abiruyt/text-extract-ocr](https://replicate-model-classifier.ziki.workers.dev/api/models/abiruyt/text-extract-ocr)
- [/api/models/tencentarc/gfpgan](https://replicate-model-classifier.ziki.workers.dev/api/models/tencentarc/gfpgan)
- [/api/models/andreasjansson/clip-features](https://replicate-model-classifier.ziki.workers.dev/api/models/andreasjansson/clip-features)
- [/api/models/stability-ai/sdxl](https://replicate-model-classifier.ziki.workers.dev/api/models/stability-ai/sdxl)

### View the prompt

To get a pretty-printed view of the prompt that was used to classify the model, add the `prompt` query parameter:

```plaintext
GET /api/models/:owner/:model?prompt=1
```

Examples

- [/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1)
- [/api/models/meta/meta-llama-3-8b-instruct?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct?prompt=1)
- [/api/models/black-forest-labs/flux-schnell?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell?prompt=1)

### View everything

It can be helpful to see all the data that goes into the model classification. You can see all the data by adding the `debug` query parameter:

```plaintext
GET /api/models/:owner/:model?debug=1
```

Examples:

- [/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1)
- [/api/models/meta/meta-llama-3-8b-instruct?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct?debug=1)
- [/api/models/black-forest-labs/flux-schnell?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell?debug=1)

### View all classifications

Get all cached model classifications:

```plaintext
GET /api/classifications
```

See [/api/classifications](https://replicate-model-classifier.ziki.workers.dev/api/classifications)

Returns a JSON object with all cached classifications:

```json
{
  "classifications": [
    {
      "model": "salesforce/blip",
      "classification": {
        "summary": "Generate image captions and answer questions about images",
        "inputTypes": ["image", "text"],
        "outputTypes": ["text"],
        "task": "visual-question-answering",
        "taskSummary": "Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions.",
        "useCases": [
          "Generate image captions for social media",
          "Answer questions about medical images",
          "Create alt text for accessibility",
          "Analyze security camera footage",
          "Describe artwork for museums",
          "Generate product descriptions",
          "Answer questions about diagrams",
          "Create image-based quizzes",
          "Analyze satellite imagery",
          "Describe scenes in videos"
        ]
      },
      "createdAt": "2024-04-29T04:00:00.000Z",
      "updatedAt": "2024-04-29T04:00:00.000Z"
    }
  ]
}
```

### View cache statistics

Get statistics about the classification cache:

```plaintext
GET /api/cache/stats
```

Returns a JSON object with cache statistics:

```json
{
  "total": 100,
  "oldest": {
    "model": "salesforce/blip",
    "createdAt": "2024-04-29T04:00:00.000Z"
  },
  "newest": {
    "model": "meta/meta-llama-3-8b-instruct",
    "createdAt": "2024-04-29T05:00:00.000Z"
  }
}
```

## View Hugging Face task data

```plaintext
GET /api/tasks
```

See [/api/tasks](https://replicate-model-classifier.ziki.workers.dev/api/tasks)

## View Hugging Face task names

```plaintext
GET /api/taskNames
```

See [/api/taskNames](https://replicate-model-classifier.ziki.workers.dev/api/taskNames)

## Use Cases

Each model classification includes a `useCases` array that provides 10 specific use cases for the model. These use cases are generated by the language model based on the model's capabilities, input/output types, and task classification. Each use case is a concise, single-sentence description of a practical application of the model.

The use cases are designed to be:
- Specific and actionable
- Diverse in their applications
- Relevant to the model's capabilities
- Concise (8 words or less)
- Practical and real-world focused

This feature helps users quickly understand the potential applications of each model and find models that match their specific needs.