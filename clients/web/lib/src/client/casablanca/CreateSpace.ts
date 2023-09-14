import { Client as CasablancaClient } from '@river/sdk'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'

export async function createCasablancaSpace(
    casablancaClient: CasablancaClient,
    spaceName: string,
    networkId: string | undefined,
): Promise<CasablancaStreamIdentifier> {
    const result = await casablancaClient.createSpace(networkId, { name: spaceName })
    await casablancaClient.waitForStream(result.streamId)
    return makeCasablancaStreamIdentifier(result.streamId)
}
