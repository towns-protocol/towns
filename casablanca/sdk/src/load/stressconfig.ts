export const jsonRpcProviderUrl = 'http://localhost:8545' //BASE_CHAIN_RPC_URL: required for follower and leader nodes.
export const rpcClientURL = 'http://localhost:5157' //RIVER_NODE_URL: required for follower and leader nodes.

// http://localhost:3000/t/SPCE-EJC7EVqlJZWfvilJuaaev/?invite
// http://localhost:3000/t/SPCE-A6HB4WiKq0-XqVw7liRKY/?invite
export const townsToCreate = 3 // NUM_TOWNS: number of towns to create. required for leader node.
export const channelsPerTownToCreate = 3 // NUM_CHANNELS_PER_TOWN: number of channels to create for every town. required for leader node.

export const defaultJoinFactor = 2 // JOIN_FACTOR: seed range for channel numbers. required for follower nodes.
export const followersNumber = 2 // NUM_FOLLOWERS: used for verification. required for leader node.
export const maxDelayBetweenMessagesPerUserMiliseconds = 10000 // MAX_MSG_DELAY_MS: (milliseconds) maximum delay between 2 messages. required for follower nodes.

export const loadDurationMs = 1000 * 60 * 60 * 0.03 // LOAD_TEST_DURATION_MS: (milliseconds) required for both leader and follower nodes
export const defaultChannelSamplingRate = 100 // CHANNEL_SAMPLING_RATE: [0-100] required for both leader and follower nodes.

export const defaultRedisHost = 'localhost' // REDIS_HOST: required for both leader and follower nodes.
export const defaultRedisPort = 6379 // REDIS_PORT: required for both leader and follower nodes.

export const defaultCoordinatorLeaveChannelsFlag = true // COORDINATOR_LEAVE_CHANNELS: required for leader node.

export const defaultHeapDumpCounter = 0
export const defaultHeapDumpFirstSnapshoMs = 60000
export const defaultHeapDumpIntervalMs = 1200000
