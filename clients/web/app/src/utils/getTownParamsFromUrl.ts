import { makeSpaceStreamId } from '@towns-protocol/sdk'
import { PATHS, PATHS_REGEX } from 'routes'
import { isTownsAppUrl } from './isTownsAppUrl'

const townsIdRegex = new RegExp(
    `${PATHS.SPACES}/${PATHS_REGEX.SPACE_ID}(?:|/|/${PATHS.CHANNELS}/${PATHS_REGEX.CHANNEL_ID})(?:/|$)`,
)

export const getTownParamsFromUrl = (url: string | undefined) => {
    if (typeof url !== 'string' || !isTownsAppUrl(url)) {
        return undefined
    }
    try {
        const parsedUrl = new URL(url)
        const pathname = parsedUrl.pathname
        const parsed = pathname.match(townsIdRegex)
        let townId = parsed?.[1]
        if (townId?.startsWith('0x')) {
            townId = makeSpaceStreamId(townId)
        }
        const channelId = parsed?.[2]
        return townId ? { townId, channelId, townPath: pathname } : undefined
    } catch (e) {
        return undefined
    }
}
