export const leaderKey = '53c240b5f9645196e090e5b99b32d5a451f62de39d165cc38cd0f82b31422c81'
export const leaderId = '0x7cab8F39f7FF0CDceB18881526caA33613C1Bc1E' //Artem Privy through AppleId
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

export const testBetaName = 'test-beta'
export const testSpamChannelName = 'test spam'

export const jsonRpcProviderUrl = 'https://sepolia.base.org'
export const envName = process.env.ENVIRONMENT_NAME || testBetaName

export const fromFollowerQueueName = 'healthcheckqueuefollower'
export const fromLeaderQueueName = 'healthcheckqueueleader'
