import { dlogger } from '@river-build/dlog'
import { makeBotName } from '../../utils/botName'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'

export async function updateProfile(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger(`stress:updateProfile:${client.logId}`)
    // set the name and profile picture in the space
    const spaceStream = await client.streamsClient.waitForStream(cfg.spaceId)
    const existingName = spaceStream.view?.membershipContent.userMetadata.usernames.info(
        client.userId,
    )

    if (existingName.username == '' && !existingName.usernameEncrypted) {
        const name = makeBotName(client.clientIndex)
        logger.log('updating profile to: ' + name)
        await client.streamsClient.setUsername(cfg.spaceId, name)
    }
}
