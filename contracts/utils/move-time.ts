import { network } from 'hardhat'

export async function moveTime(amount: number) {
  console.log(`Moving time forward by ${amount} seconds`)
  await network.provider.send('evm_increaseTime', [amount])
  console.log('Done moving time')
}
