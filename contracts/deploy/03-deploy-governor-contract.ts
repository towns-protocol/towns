import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import {
  VOTING_DELAY,
  VOTING_PERIOD,
  QUORUM_PERCENTAGE,
} from '../helper-hardhat-config'

const deployGovernorContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log, get } = deployments
  const { deployer } = await getNamedAccounts()

  const zionToken = await get('Zion')
  const timeLock = await get('TimeLock')

  log('Deploying Governor...')

  const governorContract = await deploy('GovernorContract', {
    from: deployer,
    args: [
      zionToken.address,
      timeLock.address,
      VOTING_DELAY,
      VOTING_PERIOD,
      QUORUM_PERCENTAGE,
    ],
    log: true,
  })
  log('Deployed Governor to address: ' + governorContract.address)
}

export default deployGovernorContract
