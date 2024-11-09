import { Router } from 'itty-router'
import { createErrorResponse, createSuccessResponse, ErrorCode } from './createResponse'
import { Env } from '.'
import { WorkerRequest } from './utils'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { Claim, MerkleData, MerkleTreeDump, MerkleProofResponse, VerifyProofRequest } from './types'

const router = Router()

router.post('/admin/api/merkle-root', async (request: WorkerRequest, env: Env) => {
    try {
        const { claims, conditionId }: { claims: Claim[]; conditionId: string } =
            await request.json()

        if (!Array.isArray(claims) || claims.length === 0) {
            return createErrorResponse(400, 'Invalid claims array', ErrorCode.BAD_REQUEST)
        }

        if (!conditionId) {
            return createErrorResponse(400, 'Missing conditionId', ErrorCode.BAD_REQUEST)
        }

        const tree = StandardMerkleTree.of(
            claims.map((claim) => [claim.address, claim.amount]),
            ['address', 'uint256'],
        )

        const merkleData: MerkleData = {
            merkleRoot: tree.root,
            claims,
            treeDump: tree.dump() as MerkleTreeDump,
        }

        // Check if merkle root already exists
        const key = `${conditionId}-${merkleData.merkleRoot}`
        const existing = await env.MERKLE_OBJECTS_R2.get(key)

        if (existing) {
            return createErrorResponse(409, 'Merkle root already exists', ErrorCode.ALREADY_EXISTS)
        }

        // Store merkle data in R2 bucket
        await env.MERKLE_OBJECTS_R2.put(key, JSON.stringify(merkleData), {
            httpMetadata: { contentType: 'application/json' },
        })

        return createSuccessResponse(200, 'Merkle root created', {
            merkleRoot: merkleData.merkleRoot,
        })
    } catch (error) {
        console.error(error)
        return createErrorResponse(500, `Error processing request`, ErrorCode.INTERNAL_SERVER_ERROR)
    }
})

router.post('/api/merkle-proof', async (request: WorkerRequest, env: Env) => {
    try {
        const {
            conditionId,
            merkleRoot,
            claim,
        }: {
            conditionId: string
            merkleRoot: string
            claim: Claim
        } = await request.json()

        if (!conditionId || !merkleRoot || !claim) {
            return createErrorResponse(400, 'Missing required parameters', ErrorCode.BAD_REQUEST)
        }

        // Get merkle data from R2
        const key = `${conditionId}-${merkleRoot}`
        const merkleDataObj = await env.MERKLE_OBJECTS_R2.get(key)

        if (!merkleDataObj) {
            return createErrorResponse(
                404,
                'Merkle data not found',
                ErrorCode.MERKLE_TREE_NOT_FOUND,
            )
        }

        const merkleData: MerkleData = JSON.parse(await merkleDataObj.text())
        // Load the tree from the stored dump
        const tree = StandardMerkleTree.load({
            ...merkleData.treeDump,
            format: 'standard-v1',
        })

        // Find the value in the tree and generate proof
        let proof: string[] | null = null
        for (const [i, v] of tree.entries()) {
            if (v[0] === claim.address && v[1] === claim.amount) {
                proof = tree.getProof(i)
                break
            }
        }

        if (!proof) {
            return createErrorResponse(
                404,
                'Address and amount combination not found in merkle tree',
                ErrorCode.CLAIM_NOT_FOUND,
            )
        }

        const response: MerkleProofResponse = {
            proof,
            leaf: [claim.address, claim.amount],
        }

        return createSuccessResponse(200, 'Proof generated successfully', response)
    } catch (error) {
        console.error(error)
        return createErrorResponse(500, 'Error processing request', ErrorCode.INTERNAL_SERVER_ERROR)
    }
})

router.post('/api/verify-proof', async (request: WorkerRequest, env: Env) => {
    try {
        const { conditionId, merkleRoot, proof, leaf }: VerifyProofRequest = await request.json()

        if (!conditionId || !merkleRoot || !Array.isArray(proof) || !Array.isArray(leaf)) {
            return createErrorResponse(400, 'Missing or invalid parameters', ErrorCode.BAD_REQUEST)
        }

        // Get merkle data from R2
        const key = `${conditionId}-${merkleRoot}`
        const merkleDataObj = await env.MERKLE_OBJECTS_R2.get(key)

        if (!merkleDataObj) {
            return createErrorResponse(
                404,
                'Merkle data not found',
                ErrorCode.MERKLE_TREE_NOT_FOUND,
            )
        }

        // Verify the proof with properly formatted leaf
        const isValid = StandardMerkleTree.verify(merkleRoot, ['address', 'uint256'], leaf, proof)

        if (!isValid) {
            return createErrorResponse(400, 'Invalid merkle proof', ErrorCode.INVALID_PROOF)
        }

        return createSuccessResponse(200, 'Proof verified successfully', { verified: true })
    } catch (error) {
        console.error(error)
        return createErrorResponse(500, 'Error processing request', ErrorCode.INTERNAL_SERVER_ERROR)
    }
})

router.get('*', () => createErrorResponse(404, 'Not Found', ErrorCode.NOT_FOUND))

export const handleRequest = (request: WorkerRequest, env: Env) => router.handle(request, env)
