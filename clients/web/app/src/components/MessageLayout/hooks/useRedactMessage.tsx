import React, { useCallback, useState } from 'react'
import isError from 'lodash/isError'
import { useTownsClient } from 'use-towns-client'
import { trackPostedMessage } from '@components/Analytics/postedMessage'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useShortcut } from 'hooks/useShortcut'
import { isInputFocused } from '@components/RichTextPlate/utils/helpers'

type Props = {
    channelId: string | undefined
    eventId: string
    spaceId: string | undefined
    threadId: string | undefined
    canReplyInline: boolean
    replyToEventId: string | undefined
}

export function useRedactMessage(props: Props) {
    const { channelId, eventId, spaceId, threadId, canReplyInline, replyToEventId } = props

    const [deletePrompt, setDeletePrompt] = useState<'redactOther' | 'redactSelf' | undefined>(
        undefined,
    )

    const setDeletePromptToRedactSelf = useShortcut(
        'DeleteMessage',
        useCallback(() => {
            if (channelId && eventId) {
                setDeletePrompt('redactSelf')
            }
        }, [channelId, eventId, setDeletePrompt]),
        { enableOnContentEditable: false, enabled: !isInputFocused() },
        [],
    )

    const setDeletePromptToRedactOther = useCallback(() => {
        setDeletePrompt('redactOther')
    }, [setDeletePrompt])

    const setDeletePromptToUndefined = useCallback(() => {
        setDeletePrompt(undefined)
    }, [])

    const { redactEvent, clientSingleton } = useTownsClient()

    const onRedactSelfConfirm = useCallback(() => {
        if (channelId) {
            redactEvent(channelId, eventId)

            trackPostedMessage({
                spaceId,
                channelId,
                threadId,
                canReplyInline,
                replyToEventId,
                messageType: 'redacted',
            })
        }
    }, [canReplyInline, channelId, eventId, redactEvent, replyToEventId, spaceId, threadId])

    const onRedactOtherConfirm = useCallback(async () => {
        if (channelId && eventId) {
            try {
                await clientSingleton?.adminRedactMessage(channelId, eventId)
                trackPostedMessage({
                    spaceId,
                    channelId,
                    threadId,
                    canReplyInline,
                    replyToEventId,
                    messageType: 'admin redacted',
                })
            } catch (error) {
                console.error('onRedactOtherConfirm failed to redact message', error)
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        message="Failed to redact message"
                        subMessage={isError(error) ? error.toString() : undefined}
                        toast={toast}
                    />
                ))
            }
        }
    }, [channelId, eventId, clientSingleton, spaceId, threadId, canReplyInline, replyToEventId])

    return {
        onRedactSelfConfirm,
        onRedactOtherConfirm,
        setDeletePromptToRedactSelf,
        setDeletePromptToRedactOther,
        setDeletePromptToUndefined,
        deletePrompt,
    }
}
