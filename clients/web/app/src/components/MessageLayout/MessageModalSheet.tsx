import React, { useCallback, useContext, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { useZionClient } from 'use-zion-client'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { Button, Divider, Icon, Stack, useZLayerContext } from '@ui'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { EmojiPickerContainerMobile } from '@components/EmojiPickerButton/EmojiPickerContainerMobile'
import { TableCell } from '@components/TableCell/TableCell'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    onClose: () => void
    eventId: string
    channelId?: string
    spaceId?: string
    canEdit?: boolean
    canReply?: boolean
    canReact?: boolean
    messageBody?: string
}

const emojis: { id: string; native: string }[] = [
    { id: '+1', native: '👍' },
    { id: 'raised_hands', native: '🙌' },
    { id: 'heart', native: '❤️' },
    { id: 'eyes', native: '👀' },
    { id: 'saluting_face', native: '🫡' },
]

export const MessageModalSheet = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined

    const { onClose, eventId, spaceId, channelId, canReply, canEdit, canReact, messageBody } = props
    const [isHidden, setIsHidden] = React.useState(false)
    const { redactEvent, sendReaction } = useZionClient()

    const [isOpen, setIsOpen] = useState(false)
    useEffect(() => {
        setIsOpen(true)
    }, [])

    const closeSheet = useCallback(() => {
        setIsOpen(false)
        setTimeout(() => {
            onClose()
        }, 300)
    }, [setIsOpen, onClose])

    const onEditClick = useCallback(() => {
        closeSheet()
        timelineContext?.timelineActions.onSelectEditingMessage(eventId)
    }, [eventId, timelineContext, closeSheet])

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)
    const onThreadClick = useCallback(() => {
        onClose()
        onOpenMessageThread(eventId)
    }, [eventId, onClose, onOpenMessageThread])

    const [activePrompt, setActivePrompt] = useState<'emoji' | 'delete' | undefined>(undefined)

    const onDeleteClick = useCallback(() => {
        if (channelId && eventId) {
            setActivePrompt('delete')
            setIsHidden(true)
        }
    }, [channelId, eventId])

    const onDeleteConfirm = useCallback(() => {
        if (channelId) {
            redactEvent(channelId, eventId)
        }
    }, [channelId, eventId, redactEvent])

    const onDeleteCancel = useCallback(() => {
        setActivePrompt(undefined)
        setIsHidden(false)
    }, [])

    const onCancelEmoji = useCallback(() => {
        setActivePrompt(undefined)
        setIsHidden(false)
    }, [])

    const onEmojiClick = useCallback(() => {
        setActivePrompt('emoji')
        setIsHidden(true)
    }, [])

    const onCopyClick = useCallback(() => {
        navigator.clipboard.writeText(messageBody ?? '')
        closeSheet()
    }, [closeSheet, messageBody])

    const sendEmoji = useCallback(
        (id: string) => {
            if (!channelId) {
                console.error('no channel id')
                return
            }
            if (!eventId) {
                console.error('no event id')
                return
            }
            sendReaction(channelId, eventId, id)
            onClose()
        },
        [onClose, channelId, eventId, sendReaction],
    )

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            sendEmoji(data.id)
            setActivePrompt(undefined)
        },
        [sendEmoji, setActivePrompt],
    )

    return (
        <>
            <Sheet
                className={modalSheetClass}
                isOpen={isOpen && !isHidden}
                detent="content-height"
                mountPoint={mountPoint}
                onClose={closeSheet}
            >
                <Sheet.Container>
                    <Sheet.Header />
                    <Sheet.Content>
                        <Stack paddingBottom="lg" alignContent="start" gap="sm">
                            <Stack
                                horizontal
                                paddingX="md"
                                paddingBottom="sm"
                                justifyContent="spaceBetween"
                                width="100%"
                                alignItems="center"
                            >
                                {emojis.map((e) => (
                                    <EmojiButton
                                        key={e.id}
                                        id={e.id}
                                        native={e.native}
                                        onClick={sendEmoji}
                                    />
                                ))}
                                <Button
                                    aspectRatio="square"
                                    size="button_rounded_md"
                                    tone="level2"
                                    onClick={onEmojiClick}
                                >
                                    <Icon type="emojiAdd" onClick={onEmojiClick} />
                                </Button>
                            </Stack>
                            <Divider />
                            <Stack paddingX="sm" gap="sm">
                                {canEdit && (
                                    <TableCell
                                        iconType="edit"
                                        text="Edit Message"
                                        onClick={onEditClick}
                                    />
                                )}
                                {canReply && (
                                    <TableCell
                                        iconType="reply"
                                        text="Reply"
                                        onClick={onThreadClick}
                                    />
                                )}

                                {canReact && (
                                    <TableCell
                                        iconType="emojiAdd"
                                        text="Add Reaction"
                                        onClick={onEmojiClick}
                                    />
                                )}
                                {messageBody && (
                                    <TableCell
                                        iconType="copy"
                                        text="Copy Text"
                                        onClick={onCopyClick}
                                    />
                                )}
                                {canEdit && (
                                    <TableCell
                                        isError
                                        iconType="delete"
                                        text="Delete Message"
                                        onClick={onDeleteClick}
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop onTap={closeSheet} />
            </Sheet>

            {activePrompt == 'delete' && (
                <DeleteMessagePrompt
                    onDeleteCancel={onDeleteCancel}
                    onDeleteConfirm={onDeleteConfirm}
                />
            )}

            {activePrompt == 'emoji' && (
                <EmojiPickerContainerMobile
                    onEmojiSelect={onSelectEmoji}
                    onCancel={onCancelEmoji}
                />
            )}
        </>
    )
}

const EmojiButton = (props: { id: string; native: string; onClick: (id: string) => void }) => {
    return (
        <Button
            aspectRatio="square"
            size="button_rounded_md"
            tone="level2"
            onClick={() => props.onClick(props.id)}
        >
            {props.native}
        </Button>
    )
}
