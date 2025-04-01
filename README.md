# Replicate Model Classifier

## API

Base URL: `https://replicate-model-classifier.ziki.workers.dev/`

### Get model classification

```
GET /api/models/:owner/:modelName
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


### Peek at the prompt

```
GET /api/models/:owner/:modelName?prompt=1
```

Examples

- [/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1](https://replicate-model-classifier.ziki.workers.dev/api/models/wavespeedai/wan-2.1-i2v-480p?prompt=1)
