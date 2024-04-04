import { getWeb3Deployment } from '@river-build/web3'

export const leaderKey = '20921e50975c1df7515ec55ad66dd16d7cea24bc7fec7f84d58ccc509136ff17' //HNTTest1
export const leaderId = '0x29B4bd8DbEA61949164E125dBe3C400aDC65a7de'
export const leaderUserName = 'Artem (AppleId)'

export const followerKey = '61cb187a9413019e97aee61ba84d3761f66eda8a05c00834b903360d0a32ecef'
export const followerId = '0x0d04e9fF8AF48B749Bb954CceF52d2114BaeE1aD' //Artem Privy through personal email
export const followerUserName = 'Artem (GMail)'

export const testRunTimeMs = 180000 // test runtime in milliseconds
export const connectionOptions = {
    host: 'localhost', // Redis server host
    port: 6379, // Redis server port
}

export const loginWaitTime = 90000
export const replySentTime = 90000

export const defaultEnvironmentName = 'gamma'
export const testSpamChannelName = 'test spam'

export const envName = process.env.ENVIRONMENT_NAME || defaultEnvironmentName

const getRiverNodeRpcUrl = (): string => {
    throw new Error('Not implemented - needs to pull from river registry')
}

export const baseChainConfig = getWeb3Deployment(envName).base

export const riverNodeRpcUrl = getRiverNodeRpcUrl()

export const jsonRpcProviderUrl =
    envName == defaultEnvironmentName
        ? 'https://sepolia.base.org'
        : `https://base-fork-${envName}.towns.com`

export const fromFollowerQueueName = 'healthcheckqueuefollower'
export const fromLeaderQueueName = 'healthcheckqueueleader'
