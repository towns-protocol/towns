import React, { useCallback, useContext, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { RoomIdentifier, useZionClient } from 'use-zion-client'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { Icon, IconName, Stack, Text, useZLayerContext } from '@ui'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { EmojiPickerContainerMobile } from '@components/EmojiPickerButton/EmojiPickerContainerMobile'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    onClose: () => void
    eventId: string
    channelId?: RoomIdentifier
    spaceId?: RoomIdentifier
    canEdit?: boolean
    canReply?: boolean
    canReact?: boolean
}

export const MessageModalSheet = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined

    const { onClose, eventId, spaceId, channelId, canReply, canEdit, canReact } = props
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

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            if (!channelId) {
                console.error('no channel id')
                return
            }
            if (!data.id) {
                console.error('no emoji id')
                return
            }
            sendReaction(channelId, eventId, data.id)
            setActivePrompt(undefined)
            onClose()
        },
        [channelId, eventId, sendReaction, onClose],
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
                        <Stack paddingX paddingBottom="lg" gap="sm" alignContent="start">
                            {canEdit && (
                                <TableCell
                                    iconType="edit"
                                    text="Edit Message"
                                    onClick={onEditClick}
                                />
                            )}
                            {canReply && (
                                <TableCell iconType="reply" text="Reply" onClick={onThreadClick} />
                            )}

                            {canReact && (
                                <TableCell
                                    iconType="emoji"
                                    text="Add Reaction"
                                    onClick={onEmojiClick}
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

type TableCellProps = {
    iconType: IconName
    text: string
    isError?: boolean
    onClick: () => void
}

const TableCell = (props: TableCellProps) => {
    const { iconType, text, isError, onClick } = props

    return (
        <Stack
            horizontal
            rounded="xs"
            background={{ hover: 'level2' }}
            gap="sm"
            alignItems="center"
            padding="sm"
            onClick={onClick}
        >
            <Icon
                type={iconType}
                size="square_lg"
                background="level2"
                color={isError ? 'error' : 'gray2'}
                padding="xs"
            />
            <Text color={isError ? 'error' : 'default'}>{text}</Text>
        </Stack>
    )
}
