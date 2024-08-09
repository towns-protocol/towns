import { Pin } from '@river-build/sdk'
import React, { useCallback, useMemo } from 'react'
import { useChannelId, usePins, useUserLookup } from 'use-towns-client'
import { useLocation, useNavigate } from 'react-router'
import { MessageLayout } from '@components/MessageLayout'
import { Panel } from '@components/Panel/Panel'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Stack } from '@ui'

export const PinsPanel = () => {
    const channelId = useChannelId()
    const pins = usePins(channelId)
    return (
        <Panel paddingX paddingY="sm" label="Pinned">
            <Stack gap paddingY="sm">
                {pins?.map((pin) => (
                    <PinnedMessage key={pin.event.hashStr} pin={pin} channelId={channelId} />
                ))}
            </Stack>
        </Panel>
    )
}

const PinnedMessage = (props: { pin: Pin; channelId: string }) => {
    const { pin } = props
    const { event } = pin
    const senderId = event.creatorUserId
    const sender = useUserLookup(senderId)

    const content = useMemo(() => {
        const content = pin.event.decryptedContent

        if (
            content?.kind === 'channelMessage' &&
            content?.content.payload.case === 'post' &&
            content?.content.payload.value.content.case === 'text'
        ) {
            return content.content.payload.value.content.value
        }
    }, [pin.event.decryptedContent])

    const navigate = useNavigate()
    const location = useLocation()
    const onMessageClick = useCallback(() => {
        navigate({
            pathname: location.pathname,
            search: location.search,
            hash: event.hashStr,
        })
    }, [event.hashStr, location.pathname, location.search, navigate])

    return (
        <MessageLayout
            relativeDate
            padding
            background="inherit"
            tabIndex={-1}
            avatarSize="avatar_x4"
            userId={senderId}
            senderId={senderId}
            name={getPrettyDisplayName(sender)}
            pin={pin}
            cursor="pointer"
            rounded="sm"
            // reactions={reactions}
            // onReaction={onReaction}

            user={sender}
            // messageSourceAnnotation={sourceAnnotation}
            timestamp={Number(event.createdAtEpochMs)}
            onClick={onMessageClick}
        >
            {content ? (
                <RichTextPreview
                    // mentions={event}
                    // channels={[...channels, ...dmChannels]}
                    content={content.body}
                />
            ) : (
                <></>
            )}
        </MessageLayout>
    )
}
