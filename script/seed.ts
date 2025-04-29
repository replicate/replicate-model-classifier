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

let total = 0
let cached = 0
let errors = 0

for (const model of mostRunModels) {  
    const url = `${baseUrl}/api/models/${model.owner}/${model.name}`
    console.log(`Processing ${model.owner}/${model.name}...`)
    
    try {
        const response = await fetch(url)
        const responseText = await response.text()
        
        if (!response.ok) {
            console.error(`\nError fetching ${url}: ${response.status} ${response.statusText}`)
            console.error('Response:', responseText)
            errors++
            continue
        }
        
        try {
            // Only try to parse as JSON if we got a successful response
            JSON.parse(responseText)
            total++
            
            const isCached = response.headers.get('X-Cache') === 'HIT'
            if (isCached) {
                cached++
                console.log('✓ Cached')
            } else {
                console.log('✓ New')
                await new Promise(resolve => setTimeout(resolve, SLEEP_DURATION))
            }
        } catch (parseError) {
            console.error(`\nError parsing JSON for ${url}:`, parseError.message)
            console.error('Response text:', responseText)
            errors++
            continue
        }
    } catch (error) {
        console.error(`\nError processing ${url}:`, error.message)
        errors++
        continue
    }
}

console.log('\nSeed complete!')
console.log(`Total processed: ${total}`)
console.log(`Cached: ${cached}`)
console.log(`New: ${total - cached}`)
console.log(`Errors: ${errors}`)