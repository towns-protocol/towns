import { Client as CasablancaClient } from '@river/sdk'

export async function createCasablancaSpace(
    casablancaClient: CasablancaClient,
    networkId: string | undefined,
): Promise<string> {
    const result = await casablancaClient.createSpace(networkId)
    await casablancaClient.waitForStream(result.streamId)
    return result.streamId
}
