import fs from 'fs'
import path from 'path'
import { createMerkleRoot } from '../merkleLib' // Assuming this exists

interface Claim {
    address: string
    amount: string
    // ... other properties
}

interface MerkleOutput {
    merkleRoot: string
    claims: Claim[]
}

function processFile() {
    // Get command line argument
    const inputFile = process.argv[2]

    if (!inputFile) {
        console.error('Please provide an input JSON file path')
        process.exit(1)
    }

    try {
        // Read and parse input file
        const jsonData = fs.readFileSync(inputFile, 'utf8')
        const { claims }: { claims: Claim[] } = JSON.parse(jsonData)
        console.log(claims)

        // Generate merkle root
        const merkleRoot = createMerkleRoot(claims)

        // Create output object
        const output: MerkleOutput = {
            merkleRoot,
            claims,
        }

        // Generate output filename
        const parsedPath = path.parse(inputFile)
        const outputFile = path.join(parsedPath.dir, `${parsedPath.name}_root${parsedPath.ext}`)

        // Write output file
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))

        console.log(`Merkle root generated successfully: ${merkleRoot}`)
        console.log(`Output written to: ${outputFile}`)
    } catch (error) {
        console.error('Error processing file:', error)
        process.exit(1)
    }
}

processFile()
