# Replicate Model Classifier

## API

Base URL: `https://replicate-model-classifier.ziki.workers.dev/`

### Classify a model

```
GET /api/models/:owner/:modelName
```

Returns a JSON object with the model classification:


```json
{
  "model": "wavespeedai/wan-2.1-i2v-480p",
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

```
GET /api/models/:owner/:modelName?prompt=1
```

Examples

- [/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1)
- [/api/models/meta/meta-llama-3-8b-instruct?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct?prompt=1)
- [/api/models/black-forest-labs/flux-schnell?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell?prompt=1)

## View everything

It can be helpful to see all the data that goes into the model classification. You can see all the data by adding the `debug` query parameter:

```
GET /api/models/:owner/:modelName?debug=1
```

Examples:

- [/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?debug=1)
- [/api/models/meta/meta-llama-3-8b-instruct?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/meta/meta-llama-3-8b-instruct?debug=1)
- [/api/models/black-forest-labs/flux-schnell?debug=1](https://replicate-model-classifier.ziki.workers.dev/api/models/black-forest-labs/flux-schnell?debug=1)


## View Hugging Face task data

```
GET /api/tasks
```

See [/api/tasks](https://replicate-model-classifier.ziki.workers.dev/api/tasks)

## View Hugging Face task names

```
GET /api/taskNames
```

See [/api/taskNames](https://replicate-model-classifier.ziki.workers.dev/api/taskNames)