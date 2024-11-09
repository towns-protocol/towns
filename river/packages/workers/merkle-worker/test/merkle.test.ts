import { createMerkleRoot, generateMerkleProof } from '../src/merkleLib'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

// Generate random claim array
const randomClaims = [
    { address: '0x1234567890123456789012345678901234567890', amount: '100' },
    { address: '0x2345678901234567890123456789012345678901', amount: '200' },
    { address: '0x3456789012345678901234567890123456789012', amount: '300' },
    { address: '0x4567890123456789012345678901234567890123', amount: '400' },
    { address: '0x5678901234567890123456789012345678901234', amount: '500' },
]

describe('Merkle Tree Functions', () => {
    it('should create a valid Merkle root', async () => {
        const root = await createMerkleRoot(randomClaims)
        expect(root).toBeTruthy()
        expect(typeof root).toBe('string')
        expect(root.startsWith('0x')).toBe(true)
    })

    it('should generate a valid Merkle proof', async () => {
        const address = randomClaims[2].address
        const amount = randomClaims[2].amount
        const proof = await generateMerkleProof(address, amount, randomClaims)

        expect(Array.isArray(proof)).toBe(true)
        expect(proof.length).toBeGreaterThan(0)
        proof.forEach((item: string) => {
            expect(typeof item).toBe('string')
            expect(item.startsWith('0x')).toBe(true)
        })
    })

    it('should verify the generated Merkle proof', async () => {
        const address = randomClaims[2].address
        const amount = randomClaims[2].amount
        const proof = generateMerkleProof(address, amount, randomClaims)

        const tree = StandardMerkleTree.of(
            randomClaims.map((claim) => [claim.address, claim.amount]),
            ['address', 'uint256'],
        )

        const verified = tree.verify([address, amount], proof)
        expect(verified).toBe(true)
    })

    it('should return an empty array for non-existent claim', async () => {
        const nonExistentAddress = '0x9999999999999999999999999999999999999999'
        const nonExistentAmount = '1000'

        const proof = await generateMerkleProof(nonExistentAddress, nonExistentAmount, randomClaims)

        expect(Array.isArray(proof)).toBe(true)
        expect(proof.length).toBe(0)
    })
})
