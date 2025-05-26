import { makeBotName } from '../../utils/botName'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { getLogger } from '../../utils/logger'

export async function updateProfile(client: StressClient, cfg: ChatConfig) {
    const logger = getLogger('stress:updateProfile', { logId: client.logId })
    // set the name and profile picture in the space
    const spaceStream = await client.streamsClient.waitForStream(cfg.spaceId)
    const existingName = spaceStream.view?.membershipContent.memberMetadata.usernames.info(
        client.userId,
    )

    if (existingName.username == '' && !existingName.usernameEncrypted) {
        const name = makeBotName(client.clientIndex)
        logger.info({ nameToUpdate: name }, 'updating profile')
        await client.streamsClient.setUsername(cfg.spaceId, name)
    }
}
