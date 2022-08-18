import { ethers, network } from 'hardhat'
import {
  FUNC,
  NEW_STORE_VALUE,
  DEVELOPMENT_CHAINS,
  VOTING_DELAY,
  VOTING_PERIOD,
  PROPOSAL_DESCRIPTION,
} from '../helper-hardhat-config'
import { moveBlocks } from '../utils/move-blocks'
import * as fs from 'fs'

export async function propose(
  args: any[],
  functionToCall: string,
  proposalDescription: string,
) {
  const governor = await ethers.getContract('ZionGovernor')
  const backgroundPicker = await ethers.getContract('BackgroundPicker')

  const encodedCall = backgroundPicker.interface.encodeFunctionData(
    functionToCall,
    args,
  )

  console.log(
    `New proposal of ${functionToCall} on ${backgroundPicker.address} con ${args} and ${proposalDescription}`,
  )

  const tx = await governor.propose(
    [backgroundPicker.address],
    [0],
    [encodedCall],
    proposalDescription,
  )
  const receipt = await tx.wait(1)

  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveBlocks(VOTING_DELAY + 1)
  }

  console.log(`Receipt is ${receipt.toString()}`)
  const proposalId = receipt.events[0].args.proposalId
  const proposalDeadline = receipt.events[0].args.proposalDeadline
  console.log(`Proposal id is ${proposalId}`)
  let proposals = JSON.parse(fs.readFileSync('proposals.json', 'utf8'))
  console.log(`Chain id is ${network.config.chainId!.toString()}`)
  proposals[network.config.chainId!.toString()].push(proposalId.toString())
  fs.writeFileSync('proposals.json', JSON.stringify(proposals))
  console.log('Wrote to file proposals.json')
  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveBlocks(VOTING_PERIOD - 50)
  }

  governor.state(proposalId).then((state: any) => {
    console.log(`Proposal state is ${state}`)
  })
  console.log('all donex')
}

propose([NEW_STORE_VALUE], FUNC, PROPOSAL_DESCRIPTION)
  .then(() => {
    console.log('Proposed new val')
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
