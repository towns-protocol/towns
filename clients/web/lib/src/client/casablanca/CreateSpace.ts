import { Client as CasablancaClient } from '@towns/sdk'
import { CreateSpaceInfo } from '../../types/zion-types'
import { SpaceProtocol } from '../../client/ZionClientTypes'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'

export async function createCasablancaSpace(
    casablancaClient: CasablancaClient,
    createSpaceInfo: CreateSpaceInfo,
    networkId: string | undefined,
): Promise<CasablancaStreamIdentifier> {
    if (createSpaceInfo.spaceProtocol !== SpaceProtocol.Casablanca) {
        throw new Error("Can't create a casablanca space with a non-casablanca protocol")
    }
    const result = await casablancaClient.createSpace(networkId, { name: createSpaceInfo.name })
    await casablancaClient.waitForStream(result.streamId)
    return makeCasablancaStreamIdentifier(result.streamId)
}
