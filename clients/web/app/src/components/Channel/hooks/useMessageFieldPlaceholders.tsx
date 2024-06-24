import { useEffect, useState } from 'react'
import { SECOND_MS } from 'data/constants'

export const useMessageFieldPlaceholders = (params: {
    isChannelWritable: boolean
    channelId: string
    channelLabel?: string
    isDmOrGDM: boolean
    userList: string
}) => {
    const { isChannelWritable, channelId, channelLabel, isDmOrGDM, userList } = params

    // for a short time, we show the user the message input even if they don't
    // have permission to send messages to the channel, this is to avoid
    // glitches while switching channels

    const [isOptimisticPermission, setOptimisticPermission] = useState(true)

    useEffect(() => {
        if (!isChannelWritable && channelId) {
            setOptimisticPermission(true)
            const timeout = setTimeout(() => {
                setOptimisticPermission(false)
            }, 3 * SECOND_MS)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [channelId, isChannelWritable])

    const placeholderContent = isDmOrGDM
        ? `Send a message to ${userList}`
        : `Send a message to #${channelLabel}`

    const placeholder =
        isChannelWritable || isOptimisticPermission
            ? placeholderContent
            : isChannelWritable === false
            ? `You don't have permission to send messages to this channel`
            : `Loading permissions`

    const imageUploadTitle = isChannelWritable
        ? `Upload to #${channelLabel}`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    return { placeholder, imageUploadTitle }
}
