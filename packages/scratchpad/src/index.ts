import { makeRiverConfig, makeSignerContextFromBearerToken, SyncAgent } from '@towns-protocol/sdk'

const signerContext = await makeSignerContextFromBearerToken('<bearer-token>')
const syncAgent = new SyncAgent({ riverConfig: makeRiverConfig('omega'), context: signerContext })
await syncAgent.start()

const { spaceIds } = syncAgent.spaces.data
console.log('✅ spaces joined', spaceIds)
await syncAgent.stop()
