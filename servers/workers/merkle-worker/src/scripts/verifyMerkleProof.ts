import { verifyMerkleProof, verifyMerkleProofSimple } from '../merkleLib'
import { Command } from 'commander'
import * as fs from 'fs'

const program = new Command()

program
    .description('Verify a merkle proof')
    .requiredOption('--proof-file <string>', 'Path to JSON file containing merkle proof')
    .option('--simple', 'Use simple merkle tree verification')
    .parse(process.argv)

const options = program.opts()

function main() {
    try {
        const useSimple = options.simple || false

        // Read and parse the JSON file
        const proofData = JSON.parse(fs.readFileSync(options.proofFile, 'utf-8'))
        const { merkleProof, address, amount, merkleRoot } = proofData

        const isValid = useSimple
            ? verifyMerkleProofSimple(merkleRoot, address, amount, merkleProof)
            : verifyMerkleProof(merkleRoot, address, amount, merkleProof)

        if (isValid) {
            console.log('✅ Merkle proof is valid')
        } else {
            console.error('❌ Merkle proof is invalid')
            process.exit(1)
        }
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

main()
