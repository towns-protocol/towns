/* eslint-disable no-console */
import { makeRiverConfig } from './riverConfig'
import { makeSignerContextFromBearerToken } from './signerContext'
import { SyncAgent } from './sync-agent/syncAgent'

const signerContext = await makeSignerContextFromBearerToken(
    '0a423078393038376538383763393964346363636362383963663762336336363863383963616235616365383866333164613364346134333833656463356662383938301241e983cb1279b19d745f7774c5995818f3a005a9ec89fc235975b3b4d2ea7662e50c2a97c71015c9e760540d159c75ced829f8ee67d071ef904dfeeeef54e504251b18b9a1d6e7f232',
)
const syncAgent = new SyncAgent({ riverConfig: makeRiverConfig('omega'), context: signerContext })
await syncAgent.start()

const { spaceIds } = syncAgent.spaces.data
console.log('✅ space created', spaceIds)
await syncAgent.stop()
