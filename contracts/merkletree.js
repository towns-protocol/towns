const fs = require('fs')
const path = require('path')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

const ALLOWLIST = 1
const WAITLIST = 0

let allowlist = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'docs/whitelist/allowlist.json'), 'utf8'),
).map((item) => {
    item.allowance = ALLOWLIST
    return item
})

let waitlist = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'docs/whitelist/waitlist.json'), 'utf8'),
).map((item) => {
    item.allowance = WAITLIST
    return item
})

const whitelist = [...allowlist, ...waitlist]

const leaves = whitelist.map(({ wallet_address, allowance }) =>
    keccak256(wallet_address, allowance),
)
const generatedMerkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })

// MerkleTree.print(generatedMerkleTree)

const rootHash = generatedMerkleTree.getHexRoot()
console.log('rootHash', rootHash)

// on a server somewhere
// const body = { wallet_address: '0x1234', allowance: 1 }
// const proof = generatedMerkleTree.getHexProof(keccak256(body.wallet_address, body.allowance))
// if (!proof.length) throw new Error('Invalid proof')
// return proof
