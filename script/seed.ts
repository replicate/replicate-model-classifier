#!/usr/bin/env node

import models from 'all-the-public-replicate-models'
import {chain} from 'lodash-es'

const MAX_MODELS = 1000

const mostRunModels = chain(models)
  .orderBy('run_count', 'desc')
  .take(MAX_MODELS)
  .value()

console.log("Seeding the cache with the most run models:")

// const baseUrl = 'https://replicate-model-classifier.ziki.workers.dev'
const baseUrl = 'http://localhost:8787'

for (const model of mostRunModels) {  
    const url = `${baseUrl}/api/models/${model.owner}/${model.name}`
    console.log(url)
    const response = await fetch(url)
    if (!response.ok) {
        console.error(`\nError fetching ${url}: ${response.status} ${response.statusText}`)
        process.exit(1)
    }
    
    const isCached = response.headers.get('X-Cache') === 'HIT'
    if (!isCached) {
        await new Promise(resolve => setTimeout(resolve, 10000))
    }
}