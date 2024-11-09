// test/index.spec.ts
import { Env, worker } from '../src/index'
import {
    Claim,
    MerkleProofResponse,
    ApiErrorResponse,
    ApiSuccessResponse,
    MerkleTreeDump,
} from '../src/types'
import { ErrorCode } from '../src/createResponse'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

const FAKE_SERVER_URL = 'http:/server.com'

function generateRequest(
    route: string,
    method = 'GET',
    headers = {},
    body?: BodyInit,
    env?: Env,
): [Request, Env] {
    const url = `${FAKE_SERVER_URL}/${route}`
    return [new Request(url, { method, headers, body }), env ?? getMiniflareBindings()]
}

describe('Merkle Tree Worker', () => {
    const testClaims: Claim[] = [
        { address: '0x1234567890123456789012345678901234567890', amount: '100000' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', amount: '200000' },
        { address: '0x9876543210987654321098765432109876543210', amount: '300000' },
    ]

    const testConditionId = 'test-condition-123'

    describe('POST /admin/api/merkle-root', () => {
        test('creates merkle root successfully', async () => {
            const result = await worker.fetch(
                ...generateRequest(
                    'admin/api/merkle-root',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        claims: testClaims,
                        conditionId: testConditionId,
                    }),
                ),
            )

            expect(result.status).toBe(200)
            const responseBody = (await result.json()) as { merkleRoot: string }
            expect(responseBody).toHaveProperty('merkleRoot')
            expect(responseBody.merkleRoot).toBeTruthy()
        })

        test('returns ALREADY_EXISTS when trying to store same merkle root', async () => {
            // First request to create
            await worker.fetch(
                ...generateRequest(
                    'admin/api/merkle-root',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        claims: testClaims,
                        conditionId: testConditionId,
                    }),
                ),
            )

            // Second request with same data
            const result = await worker.fetch(
                ...generateRequest(
                    'admin/api/merkle-root',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        claims: testClaims,
                        conditionId: testConditionId,
                    }),
                ),
            )

            expect(result.status).toBe(409)
            const responseBody = (await result.json()) as ApiErrorResponse
            expect(responseBody.errorDetail.code).toBe(ErrorCode.ALREADY_EXISTS)
        })
    })

    describe('POST /api/merkle-proof', () => {
        let merkleRoot: string

        // Setup: Create merkle root first
        beforeEach(async () => {
            const result = await worker.fetch(
                ...generateRequest(
                    'admin/api/merkle-root',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        claims: testClaims,
                        conditionId: testConditionId,
                    }),
                ),
            )
            const responseBody = (await result.json()) as { merkleRoot: string }
            merkleRoot = responseBody.merkleRoot
        })

        test('generates proof successfully for valid claim', async () => {
            const testClaim = testClaims[0] // Use first claim for testing

            const result = await worker.fetch(
                ...generateRequest(
                    'api/merkle-proof',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        conditionId: testConditionId,
                        merkleRoot: merkleRoot,
                        claim: testClaim,
                    }),
                ),
            )

            expect(result.status).toBe(200)
            const responseBody = (await result.json()) as ApiSuccessResponse<MerkleProofResponse>
            console.log(`responseBody: ${JSON.stringify(responseBody)}`)
            expect(responseBody).toHaveProperty('proof')
            expect(Array.isArray(responseBody?.proof)).toBe(true)
            expect(responseBody?.leaf).toEqual([testClaim.address, testClaim.amount])
        })

        test('returns NOT_FOUND for non-existent merkle data', async () => {
            const result = await worker.fetch(
                ...generateRequest(
                    'api/merkle-proof',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        conditionId: 'non-existent',
                        merkleRoot: 'invalid-root',
                        claim: testClaims[0],
                    }),
                ),
            )

            expect(result.status).toBe(404)
            const responseBody = (await result.json()) as ApiErrorResponse
            expect(responseBody.errorDetail.code).toBe(ErrorCode.MERKLE_TREE_NOT_FOUND)
        })

        test('returns NOT_FOUND for invalid address/amount combination', async () => {
            const result = await worker.fetch(
                ...generateRequest(
                    'api/merkle-proof',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        conditionId: testConditionId,
                        merkleRoot: merkleRoot,
                        claim: {
                            address: '0x0000000000000000000000000000000000000000',
                            amount: '999999',
                        },
                    }),
                ),
            )

            expect(result.status).toBe(404)
            const responseBody = (await result.json()) as ApiErrorResponse
            expect(responseBody.errorDetail.code).toBe(ErrorCode.CLAIM_NOT_FOUND)
        })
    })

    describe.skip('POST /api/verify-proof', () => {
        let merkleRoot: string
        let proof: string[]
        let leaf: [string, string]
        const testConditionId = 'test-condition-123'

        // Setup: Create merkle tree and store it first
        beforeEach(async () => {
            const testClaims = [
                {
                    address: '0x1234567890123456789012345678901234567890',
                    amount: '1000000000000000000',
                },
                {
                    address: '0x2345678901234567890123456789012345678901',
                    amount: '2000000000000000000',
                },
            ]

            // Create and store merkle tree
            const tree = StandardMerkleTree.of(
                testClaims.map((claim) => [claim.address, claim.amount]),
                ['address', 'uint256'],
            )
            const treeDump = tree.dump() as MerkleTreeDump
            const treeLoaded = StandardMerkleTree.load({
                ...treeDump,
                format: 'standard-v1',
            })

            merkleRoot = treeLoaded.root
            let leaf = [testClaims[0].address, testClaims[0].amount]
            // Get proof for the specific value, not the index
            let proof: string[] | null = null
            for (const [i, v] of treeLoaded.entries()) {
                if (v[0] === leaf[0] && v[1] === leaf[1]) {
                    proof = treeLoaded.getProof(i)
                    break
                }
            }
            console.log(`proof: ${proof}`)
            expect(proof).toBeDefined()
            expect(proof?.length).toBeGreaterThan(0)

            // Store the tree first
            const response = await worker.fetch(
                ...generateRequest(
                    'admin/api/merkle-root',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        claims: testClaims,
                        conditionId: testConditionId,
                    }),
                ),
            )

            const responseBody = (await response.json()) as ApiSuccessResponse<{
                merkleRoot: string
            }>
            expect(responseBody.data?.merkleRoot).toEqual(merkleRoot)
        })

        test('verifies proof successfully', async () => {
            const result = await worker.fetch(
                ...generateRequest(
                    'api/verify-proof',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        conditionId: testConditionId,
                        merkleRoot,
                        proof,
                        leaf,
                    }),
                ),
            )

            expect(result.status).toBe(200)
            const responseBody = await result.json()
            expect(responseBody).toEqual({
                success: true,
                message: 'Proof verified successfully',
                data: {
                    verified: true,
                },
            })
        })

        test('returns error for invalid proof', async () => {
            const invalidProof = ['0xdeadbeef']

            const result = await worker.fetch(
                ...generateRequest(
                    'api/verify-proof',
                    'POST',
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        conditionId: testConditionId,
                        merkleRoot,
                        proof: invalidProof,
                        leaf,
                    }),
                ),
            )

            expect(result.status).toBe(500)
            const responseBody = (await result.json()) as ApiErrorResponse
            expect(responseBody.error).toContain('Error processing request')
        })
    })
})
