import { ethers } from 'hardhat'
import { FUNC, MIN_DELAY, NEW_STORE_VALUE } from '../helper-hardhat-config'

export async function propose(args: any[], functionToCall: string) {
  const governor = await ethers.getContract('GovernorContract')
  const backgroundPicker = await ethers.getContract('BackgroundPicker')

  const encodedCall = backgroundPicker.interface.encodeFunctionData(
    functionToCall,
    args,
  )
}

//Actually call it with these temp vals
propose([NEW_STORE_VALUE], FUNC)
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
