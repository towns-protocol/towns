import { makeSpaceStreamId } from '@river-build/sdk'
import { PATHS } from 'routes'
import { isTownsAppUrl } from './isTownsAppUrl'

const townsIdRegex = new RegExp(
    `${PATHS.SPACES}/(0x[0-9a-z]{40}|[0-9a-z]{64})(?:/|/${PATHS.CHANNELS}/([0-9a-z]{64}))(?:/|$)`,
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
