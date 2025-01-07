import { SimpleMerkleTree, StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { HexString } from '@openzeppelin/merkle-tree/src/bytes'
import { keccak256 } from '@ethersproject/keccak256'
import { defaultAbiCoder } from '@ethersproject/abi'

export interface Claim {
    address: string
    amount: string
}

export function createMerkleRoot(claims: Claim[]): string {
    console.log('createMerkleRoot')
    const tree = StandardMerkleTree.of(
        claims.map((claim) => [claim.address, claim.amount]),
        ['address', 'uint256'],
    )
    return tree.root
}

export function generateMerkleProof(
    address: string,
    amount: string,
    claims: Claim[],
): { root: string | null; proof: HexString[] } {
    const tree = StandardMerkleTree.of(
        claims.map((claim) => [claim.address, claim.amount]),
        ['address', 'uint256'],
    )

    for (const [i, v] of tree.entries()) {
        if (v[0] === address && v[1] === amount) {
            return { root: tree.root, proof: tree.getProof(i) }
        }
    }

    return { root: null, proof: [] }
}

function createLeafSimple(address: string, amount: string): string {
    // First encode address and amount as packed bytes (equivalent to Solidity abi.encode)
    const encoded = defaultAbiCoder.encode(['address', 'uint256'], [address, amount])

    // Double keccak256 to match Solidity implementation
    // First hash: keccak256(abi.encode(address, amount))
    const firstHash = keccak256(encoded)
    // Second hash: keccak256(firstHash) to match the leaf inversion
    return keccak256(firstHash)
}

export function createMerkleRootSimple(claims: Claim[]): string {
    console.log('createMerkleRootSimple')
    const leaves = claims.map((claim) => createLeafSimple(claim.address, claim.amount))
    const tree = SimpleMerkleTree.of(leaves)
    return tree.root
}

export function generateMerkleProofSimple(
    address: string,
    amount: string,
    claims: Claim[],
): { root: string | null; proof: HexString[] } {
    const leaves = claims.map((claim) => createLeafSimple(claim.address, claim.amount))

    const tree = SimpleMerkleTree.of(leaves)
    const root = tree.root

    // Find the index of the target leaf
    const targetLeaf = createLeafSimple(address, amount)
    const index = leaves.findIndex((leaf) => leaf === targetLeaf)
    if (index === -1) {
        return { root: null, proof: [] }
    }

    return { root, proof: tree.getProof(index) }
}

export function verifyMerkleProof(
    root: string,
    address: string,
    amount: string,
    proof: HexString[],
): boolean {
    try {
        // Verify if the proof is valid for this leaf against the provided root
        return StandardMerkleTree.verify(root, ['address', 'uint256'], [address, amount], proof)
    } catch {
        return false
    }
}

export function verifyMerkleProofSimple(
    root: string,
    address: string,
    amount: string,
    proof: HexString[],
): boolean {
    const leaf = createLeafSimple(address, amount)

    try {
        // Verify if the proof is valid for this leaf against the provided root
        return SimpleMerkleTree.verify(root, leaf, proof)
    } catch {
        return false
    }
}
