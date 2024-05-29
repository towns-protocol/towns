import { randNumber, randParagraph, randUuid, seed } from '@ngneat/falso'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { Box, Button, Paragraph, Stack, Toggle } from '@ui'
import { VList } from 'ui/components/VList2/VList'
import { ExampleMessage } from './ExampleMessage'
import { createMessageList, randId } from './helpers/createMessages'

const NUM_MESSAGES = 10

export const VListExample = () => {
    const [list, setList] = useState(() => {
        seed('v-list-seed')
        return createMessageList(NUM_MESSAGES)
    })

    const [reset, setReset] = useState(0)

    const onResetClick = () => {
        console.clear()
        seed('v-list-seed')

        setReset(Date.now())
        setList(createMessageList(NUM_MESSAGES))
        // simulates a temp message coming back from the server (glitch)
        setTimeout(() => {
            setList((list) =>
                list.map((t, i) =>
                    i === list.length - 2 ? { ...t, id: randUuid(), message: t.message } : t,
                ),
            )
        }, 1000)
    }

    const [isDebug, setIsDebug] = useState(false)
    const onToggleDebug = (checked: boolean) => {
        setIsDebug(checked)
    }

    const onPrependClick = () => {
        console.log(`%c\n\n\nvlist::onPreprendClick`, `color:#f60`)
        setList([...createMessageList(20), ...list])
    }
    const onAppendClick = () => {
        console.log(`%c\n\n\nvlist::onAppendClick`, `color:#f60`)
        setList([...list, ...createMessageList(20)])
    }

    const updateMessage = useCallback(
        (id: string, key: 'uid' | 'content') => {
            console.clear()
            const index = list.findIndex((l) => l.id === id)
            const item = list.at(index)

            if (item && typeof index === 'number') {
                // const another = createMessage(item.timestamp, item.profile, item.color)
                let newItem = { ...item }

                if (key === 'uid') {
                    newItem = { ...item, id: randId() } as const
                } else {
                    newItem = {
                        ...item,
                        id: randId(),
                        message: randParagraph({
                            length: randNumber({ min: 1, max: 7, precision: 1 }),
                        }).join('\r\n'),
                    } as const
                }

                setList((list) => list.map((l, i) => (i === index ? newItem : l)))
            }
        },
        [list],
    )

    // console.table(list)

    const [focus, setFocus] = useState(
        () =>
            ({
                align: 'end',
                key: list[list.length - 1].id,
            } as const),
    )

    const resetRef = useRef(reset)

    useEffect(() => {
        if (reset !== resetRef.current) {
            resetRef.current = reset
            setFocus({
                align: 'end',
                key: list[list.length - 1].id,
            } as const)
        }
    }, [list, reset])

    return (
        <Stack gap height="800">
            <VList
                focusItem={focus}
                getItemKey={(item) => item.id}
                align="bottom"
                debug={isDebug}
                key={`${reset}`}
                list={list}
                overscan={1}
                estimateHeight={(s) => 100}
                itemRenderer={(data) => <TestItem data={data} updateMessage={updateMessage} />}
            />
            <Stack padding gap background="level2" borderRadius="xs">
                <Stack gap horizontal justifyContent="spaceBetween">
                    <Stack horizontal gap>
                        <Button animate={false} onClick={onPrependClick}>
                            Prepend messages
                        </Button>
                        <Button animate={false} onClick={onAppendClick}>
                            Append messages
                        </Button>
                        <Stack horizontal centerContent border paddingX rounded="sm" paddingY="sm">
                            <Stack horizontal alignItems="center" gap="sm">
                                <Toggle toggled={isDebug} onToggle={onToggleDebug} />
                                <Paragraph size="sm">Minimap</Paragraph>
                            </Stack>
                        </Stack>
                    </Stack>
                    <Stack>
                        <Button animate={false} onClick={onResetClick}>
                            Reset
                        </Button>
                    </Stack>
                </Stack>
                <Stack gap="sm">
                    <Stack horizontal gap="sm" alignItems="center" color="gray2">
                        <Stack horizontal centerContent gap="xs">
                            <Symbol>CLICK</Symbol>
                        </Stack>{' '}
                        updates key
                    </Stack>
                    <Stack horizontal gap="sm" alignItems="center" color="gray2">
                        <Stack horizontal centerContent gap="xs">
                            <Symbol>⎇</Symbol> + <Symbol>CLICK</Symbol>
                        </Stack>{' '}
                        updates height
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    )
}

const Symbol = (props: { children: React.ReactNode }) => (
    <Box
        rounded="xs"
        background="level3"
        display="inline-block"
        padding="xs"
        fontWeight="strong"
        fontSize="sm"
    >
        {props.children}
    </Box>
)

const TestItem = React.memo(
    (props: {
        data: {
            id: string
            message: string
            color: string
            timestamp: number
            profile: { name: string; avatarSrc: string }
        }
        updateMessage: (id: string, key: 'content' | 'uid') => void
    }) => {
        const { data } = props

        return (
            <Stack horizontal background="level1">
                <Stack style={{ background: data.color }} width="x1" shrink={false} />
                <Stack>
                    <ExampleMessage
                        relativeDate
                        borderRadius="xs"
                        padding="md"
                        name={data.profile.name}
                        avatar={data.profile.avatarSrc}
                        timestamp={data.timestamp}
                        onMouseDown={(e: React.MouseEvent) => {
                            const key = e.altKey ? 'content' : 'uid'
                            props.updateMessage(data.id, key)
                        }}
                    >
                        <Stack gap style={{ userSelect: 'none' }}>
                            <Paragraph size="sm" color="cta2">
                                {data.id}
                            </Paragraph>
                            <RichTextPreview content={data.message} />
                        </Stack>
                    </ExampleMessage>
                </Stack>
            </Stack>
        )
    },
)
