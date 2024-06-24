import { ChannelContextProvider } from 'use-towns-client'
import { useParams } from 'react-router'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import React from 'react'
import { ReplyContextProvider } from '@components/ReplyToMessageContext/ReplyToMessageProvider'

export const SpaceChannelWrapper = (
    props: { children: React.ReactElement } & { channelId?: string },
) => {
    const { channelSlug } = useParams()
    const channelId = props.channelId ?? channelSlug
    const isDmOrGDM =
        channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))

    if (!channelId) {
        return <>SpacesChannel Route expects a channelSlug</>
    }
    return (
        <ChannelContextProvider channelId={channelId}>
            <ReplyContextProvider key={channelId} canReplyInline={!!isDmOrGDM}>
                {props.children}
            </ReplyContextProvider>
        </ChannelContextProvider>
    )
}
