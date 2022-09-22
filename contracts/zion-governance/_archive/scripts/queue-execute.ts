import { ethers, network } from 'hardhat'
import {
  DEVELOPMENT_CHAINS,
  FUNC,
  MIN_DELAY,
  NEW_STORE_VALUE,
  PROPOSAL_DESCRIPTION,
  VOTING_PERIOD,
} from '../helper-hardhat-config'
import { moveBlocks } from '../utils/move-blocks'
import { moveTime } from '../utils/move-time'

export async function queueExecute() {
  const args = [NEW_STORE_VALUE]
  const backgroundPicker = await ethers.getContract('BackgroundPicker')
  const encodedCall = backgroundPicker.interface.encodeFunctionData(FUNC, args)
  const descriptionHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION),
  )

  const governor = await ethers.getContract('ZionGovernor')
  console.log(`Queueing proposal of ${FUNC} on ${backgroundPicker.address}`)
  const qTx = await governor.queue(
    [backgroundPicker.address],
    [0],
    [encodedCall],
    descriptionHash,
  )

  await qTx.wait(1)

  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)
  }

  console.log(`Executing...`)
  const eTx = await governor.queue(
    [backgroundPicker.address],
    [0],
    [encodedCall],
    descriptionHash,
  )
  await eTx.wait(1)

  const newBackgroundVal = await backgroundPicker.retrieve()
  console.log(`New background value is ${newBackgroundVal}`)
}

queueExecute()
  .then(() => {
    console.log(`Done queueing and executing`)
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
