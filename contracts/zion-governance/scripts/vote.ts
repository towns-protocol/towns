import * as fs from 'fs'
import { network, ethers } from 'hardhat'
import { DEVELOPMENT_CHAINS, VOTING_PERIOD } from '../helper-hardhat-config'
import { moveBlocks } from '../utils/move-blocks'

async function main(proposalIndex: number) {
  const proposals = JSON.parse(fs.readFileSync('proposals.json', 'utf8'))
  const chainId = network.config.chainId!.toString()
  console.log(`ChainId is ${chainId}`)
  const proposalId =
    proposals[network.config.chainId!.toString()][proposalIndex]
  console.log(`Proposal id is ${proposalId}`)
  const howVote = 1 // 1 for yes, 0 for no

  await vote(proposalId, howVote, 'vooote for it')
}

export async function vote(
  proposalId: number,
  howVote: number,
  voteDescription: string,
) {
  const governor = await ethers.getContract('ZionGovernor')
  const proposalSnapshot = await governor.proposalSnapshot(proposalId)
  const proposalDeadline = await governor.proposalDeadline(proposalId)

  const blockNumber = await governor.blockNumber()

  console.log(`Proposal Deadline is ${proposalDeadline}`)
  console.log(`Proposal snapshot is ${proposalSnapshot}`)
  console.log(`Block number is ${blockNumber}`)

  governor.state(proposalId).then((state: any) => {
    console.log(`Proposal state is ${state}`)
  })
  const tx = await governor.castVoteWithReason(
    proposalId,
    howVote,
    voteDescription,
  )
  await tx.wait(1)
  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveBlocks(VOTING_PERIOD + 1)
  }
  console.log('Done voting')

  governor.state(proposalId).then((state: any) => {
    console.log(`Proposal state is ${state}`)
  })
}

const index = 0
main(index)
  .then(() => {
    console.log('Done voting from main')
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
