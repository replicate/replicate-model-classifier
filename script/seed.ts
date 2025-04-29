#!/usr/bin/env node

import models from 'all-the-public-replicate-models'
import {chain} from 'lodash-es'

const MAX_MODELS = 10000
const SLEEP_DURATION = 0.5 * 1000

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
    
    try {
        const response = await fetch(url)
        const responseText = await response.text()
        
        if (!response.ok) {
            console.error(`\nError fetching ${url}: ${response.status} ${response.statusText}`)
            console.error('Response:', responseText)
            continue // Skip to next model instead of exiting
        }
        
        try {
            // Only try to parse as JSON if we got a successful response
            JSON.parse(responseText)
            // console.log(`Successfully processed ${model.owner}/${model.name}`)
        } catch (parseError) {
            console.error(`\nError parsing JSON for ${url}:`, parseError.message)
            console.error('Response text:', responseText)
            continue
        }
        
        const isCached = response.headers.get('X-Cache') === 'HIT'
        if (!isCached) {
            await new Promise(resolve => setTimeout(resolve, SLEEP_DURATION))
        }
    } catch (error) {
        console.error(`\nError processing ${url}:`, error.message)
        continue
    }
}