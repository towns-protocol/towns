import React, { useEffect, useState } from 'react'
import { firstBy } from 'thenby'
import { DMChannelIdentifier } from 'use-towns-client'
import { Box, BoxProps, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageRowContent } from '../DirectMessageListItem'

type Props = {
    channels: DMChannelIdentifier[]
    createNewCTA: JSX.Element | string | undefined
    onSelectChannel: (channelId: string) => void
    onFocusChange: (channel: DMChannelIdentifier) => void
    onCreateNew: () => void
}

export const MessageDropDown = (props: Props) => {
    const { channels, createNewCTA, onSelectChannel, onFocusChange, onCreateNew } = props
    const listRef = React.useRef<HTMLDivElement>(null)

    const [focusedIndex, setFocusedIndex] = useState(0)
    const { isTouch } = useDevice()

    useEffect(() => {
        if (channels) {
            setFocusedIndex(isTouch ? -1 : 0)
        }
    }, [channels, isTouch])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
                return
            }
            switch (e.key) {
                case 'ArrowUp': {
                    setFocusedIndex((i) => Math.max(0, i - 1))
                    break
                }
                case 'ArrowDown': {
                    setFocusedIndex((i) => Math.min(i + 1, channels.length))
                    break
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [channels, focusedIndex, onCreateNew, onSelectChannel])

    useEffect(() => {
        listRef.current?.querySelectorAll('[data-list-item]').item(focusedIndex)?.scrollIntoView({
            block: 'end',
        })
        onFocusChange(channels[focusedIndex])
    }, [channels, focusedIndex, onFocusChange])

    if (!props.channels?.length && !createNewCTA) {
        return <></>
    }

    return (
        <Box
            gap
            scroll
            paddingX="md"
            paddingY="sm"
            background="level2"
            rounded="sm"
            style={{ maxHeight: 288 }}
            boxShadow="card"
            ref={listRef}
        >
            {props.channels.length > 0 && (
                <>
                    <Box paddingTop="sm">
                        <Paragraph color="gray2">
                            {props.channels.length === 1 && !props.channels[0].isGroup
                                ? 'Open direct message'
                                : 'Common Groups'}
                        </Paragraph>
                    </Box>
                    <Stack elevate gap="xs">
                        {props.channels?.sort(firstBy((c) => c.userIds.length)).map((c, index) => (
                            <ContainerItem
                                key={c.id}
                                data-list-item={index}
                                background={index === focusedIndex ? 'level2' : 'level1'}
                                onClick={() => props.onSelectChannel(c?.id)}
                            >
                                <DirectMessageRowContent channel={c} unread={false} />
                            </ContainerItem>
                        ))}
                    </Stack>
                </>
            )}
            {createNewCTA && (
                <ContainerItem
                    height="x6"
                    alignItems="center"
                    gap="sm"
                    key="create-new"
                    background={focusedIndex === props.channels.length ? 'level3' : 'level2'}
                    data-list-item={props.channels.length}
                    onClick={props.onCreateNew}
                >
                    {createNewCTA}
                </ContainerItem>
            )}
        </Box>
    )
}

const ContainerItem = (props: BoxProps) => (
    <Box
        horizontal
        gap
        rounded="xs"
        insetX="xs"
        paddingX="sm"
        paddingY="sm"
        minHeight="x7"
        {...props}
        hoverable
        cursor="pointer"
    />
)
