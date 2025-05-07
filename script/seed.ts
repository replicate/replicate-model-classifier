#!/usr/bin/env node

import models from 'all-the-public-replicate-models'
import {chain} from 'lodash-es'

const MAX_MODELS = 20_000
const SLEEP_DURATION = 0 * 1000

const mostRunModels = chain(models)
  .orderBy('run_count', 'desc')
  .take(MAX_MODELS)
  .value()

console.log("Seeding the cache with the most run models:")

const baseUrl = 'https://replicate-model-classifier.ziki.workers.dev'
// const baseUrl = 'http://localhost:8787'

let total = 0
let cached = 0
let errors = 0

for (const model of mostRunModels) {  
    const url = `${baseUrl}/api/models/${model.owner}/${model.name}`
    
    try {
        const response = await fetch(url)
        const responseText = await response.text()
        
        if (!response.ok) {
            console.log(`❌ ${model.owner}/${model.name} - Error: ${response.status} ${response.statusText}`)
            errors++
            continue
        }
        
        try {
            JSON.parse(responseText)
            total++
            
            const isCached = response.headers.get('X-Cache') === 'HIT'
            if (isCached) {
                cached++
                console.log(`✓ ${model.owner}/${model.name} - Cached`)
            } else {
                console.log(`✓ ${model.owner}/${model.name} - New`)
                await new Promise(resolve => setTimeout(resolve, SLEEP_DURATION))
            }
        } catch (parseError) {
            console.log(`❌ ${model.owner}/${model.name} - JSON parse error: ${parseError.message}`)
            errors++
            continue
        }
    } catch (error) {
        console.log(`❌ ${model.owner}/${model.name} - Error: ${error.message}`)
        errors++
        continue
    }
}

console.log('\nSeed complete!')
console.log(`Total processed: ${total}`)
console.log(`Cached: ${cached}`)
console.log(`New: ${total - cached}`)
console.log(`Errors: ${errors}`)