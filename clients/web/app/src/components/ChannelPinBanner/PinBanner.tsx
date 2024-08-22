import React from 'react'
import { usePins } from 'use-towns-client'
import { PinnedMessage } from '@components/PinMessage/PinMessage'

export const ChannelPinBanner = (props: { channelId: string }) => {
    const pins = usePins(props.channelId)
    const pin = pins?.at(pins.length - 1)
    return !!pin && <PinnedMessage channelId={props.channelId} pin={pin} />
}
