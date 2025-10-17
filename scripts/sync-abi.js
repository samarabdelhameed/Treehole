#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const contractsOutDir = path.join(rootDir, 'contracts/out')
const frontendAbiDir = path.join(rootDir, 'frontend/public/abi')

const contracts = ['PaymentSplitter', 'TestToken']

function syncABI() {
  console.log('Syncing ABI files...')
  console.log(`From: ${contractsOutDir}`)
  console.log(`To:   ${frontendAbiDir}`)
  
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true })
  }
  
  contracts.forEach(contractName => {
    const sourcePath = path.join(contractsOutDir, `${contractName}.sol`, `${contractName}.json`)
    const targetPath = path.join(frontendAbiDir, `${contractName}.json`)
    
    try {
      if (fs.existsSync(sourcePath)) {
        const contractData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
        const abiData = {
          abi: contractData.abi,
          bytecode: contractData.bytecode
        }
        
        fs.writeFileSync(targetPath, JSON.stringify(abiData, null, 2))
        console.log(`✓ Synced ${contractName}.json`)
      } else {
        console.log(`⚠ Source file not found: ${sourcePath}`)
      }
    } catch (error) {
      console.error(`✗ Failed to sync ${contractName}:`, error.message)
    }
  })
  
  console.log('ABI sync completed!')
}

syncABI()