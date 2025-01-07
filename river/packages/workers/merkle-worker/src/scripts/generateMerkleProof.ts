import fs from 'fs'
import path from 'path'
import { generateMerkleProof, generateMerkleProofSimple } from '../merkleLib'

interface Claim {
    address: string
    amount: string
}

interface ProofOutput {
    merkleProof: string[]
    address: string
    amount: string
    merkleRoot: string
}

function processFile() {
    // Get command line arguments
    const inputFile = process.argv[2]
    const address = process.argv[3]
    const amount = process.argv[4]
    const simpleFlag = process.argv[5] === '--simple'

    if (!inputFile || !address || !amount) {
        console.error('Usage: script <input_file> <address> <amount> [--simple]')
        process.exit(1)
    }

    try {
        // Read and parse input file
        const jsonData = fs.readFileSync(inputFile, 'utf8')
        const { claims }: { claims: Claim[] } = JSON.parse(jsonData)

        // Generate merkle proof based on flag
        const merkleProof = simpleFlag
            ? generateMerkleProofSimple(address, amount, claims)
            : generateMerkleProof(address, amount, claims)

        // Get merkle root from the first element of the proof
        const merkleRoot = merkleProof.root

        // Create output object
        const output: ProofOutput = {
            merkleProof: merkleProof.proof,
            address,
            amount,
            merkleRoot: merkleRoot || '',
        }

        // Generate output filename
        const parsedPath = path.parse(inputFile)
        const outputFile = path.join(
            parsedPath.dir,
            `${parsedPath.name}_proof_${address}${parsedPath.ext}`,
        )

        // Write output file
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))

        console.log(`Merkle proof generated successfully for address: ${address}`)
        console.log(`Output written to: ${outputFile}`)
    } catch (error) {
        console.error('Error processing file:', error)
        process.exit(1)
    }
}

processFile()
