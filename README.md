# Replicate Model Classifier

An HTTP API to classify [Replicate models](https://replicate.com/explore) into [Hugging Face tasks](https://huggingface.co/tasks) using a language model.

Powered by:

- **Cloudflare Workers** for hosting the HTTP API
- **Cloudflare KV** for caching
- **Hono** for authoring the HTTP API
- **Anthropic Claude 3.7 Sonnet** for model classification
- **Replicate API** for model metadata
- **Hugging Face Tasks** for model task metadata

Repository: https://github.com/zeke/replicate-model-classifier

## API

Base URL: `https://replicate-model-classifier.ziki.workers.dev/`

### Classify a model

```plaintext
GET /api/models/:owner/:model
```

Returns a JSON object with the model classification:


  ```json
  {
      "model": "salesforce/blip",
      "classification": {
          "summary": "Generate image captions and answer questions about images",
          "inputTypes": ["image", "text"],
          "outputTypes": ["text"],
          "task": "visual-question-answering",
          "taskSummary": "Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions."
      }
  }
  ```

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

## View everything

It can be helpful to see all the data that goes into the model classification. You can see all the data by adding the `debug` query parameter:

```plaintext
GET /api/models/:owner/:model?debug=1
```

Examples:

- [/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1)
- [/api/models/meta/meta-llama-3-8b-instruct?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct?debug=1)
- [/api/models/black-forest-labs/flux-schnell?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell?debug=1)

## Bust the cache

Responses are cached forever by default. To bust the cache for a specific model, use the `force` query parameter:

```plaintext
GET /api/models/:owner/:model?force=1
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

## View all cached classifications

```plaintext
GET /api/classifications
```

Returns a JSON object containing all cached model classifications. Each key is the model identifier (owner/modelName) and the value is the classification data.

Example response:

```json
{
  "salesforce/blip": {
    "summary": "Generate image captions and answer questions about images",
    "inputTypes": ["image", "text"],
    "outputTypes": ["text"],
    "task": "visual-question-answering",
    "taskSummary": "Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions."
  },
  "meta/meta-llama-3-8b-instruct": {
    "summary": "A large language model for text generation and instruction following",
    "inputTypes": ["text"],
    "outputTypes": ["text"],
    "task": "text-generation",
    "taskSummary": "Text generation is the task of generating text that is coherent and contextually relevant."
  }
}
```

See [/api/classifications](https://replicate-model-classifier.ziki.workers.dev/api/classifications)