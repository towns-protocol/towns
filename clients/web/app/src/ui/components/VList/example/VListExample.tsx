import { seed } from '@ngneat/falso'
import React, { useCallback, useState } from 'react'
import { Button, Paragraph, Stack } from '@ui'
import { VList } from 'ui/components/VList/VList'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { ExampleMessage } from './ExampleMessage'
import { createMessageList } from './helpers/createMessages'

const NUM_MESSAGES = 1

export const VListExample = () => {
    const [list, setList] = useState(() => {
        seed('v-list-seed')
        return createMessageList(NUM_MESSAGES)
    })

    const [reset, setReset] = useState(0)

    const onResetClick = () => {
        console.clear()
        seed('v-list-seed')
        setList(createMessageList(NUM_MESSAGES))
        setReset(Date.now())
    }

    const onPrependClick = () => {
        console.clear()
        setList([...createMessageList(10), ...list])
    }
    const onAppendClick = () => {
        console.clear()
        setList([...list, ...createMessageList(5)])
    }

    const onAppendNew = () => {
        console.clear()
        setList([...list, ...createMessageList(1)])
    }

    const updateMessage = useCallback(
        (id: string) => {
            const index = list.findIndex((l) => l.id === id)
            const item = list.at(index)

            if (item && index) {
                // const another = createMessage(item.timestamp, item.profile, item.color)
                const newItem = { ...item, id: Math.random().toString(16) }
                setList((list) => list.map((l, i) => (i === index ? newItem : l)))
                // setList([...list.slice(0, index), newItem, ...list.slice(index + 1)])
            }
        },
        [list],
    )

    return (
        <Stack gap height="800">
            <VList
                key={`${reset}`}
                list={list}
                itemRenderer={(data) => {
                    return (
                        <Stack horizontal>
                            <Stack style={{ background: data.color }} width="x1" shrink={false} />
                            <ExampleMessage
                                relativeDate
                                borderRadius="xs"
                                padding="md"
                                name={data.profile.name}
                                avatar={data.profile.avatarSrc}
                                timestamp={data.timestamp}
                                onClick={() => {
                                    updateMessage(data.id)
                                }}
                            >
                                <RichTextPreview content={data.message} />
                            </ExampleMessage>
                        </Stack>
                    )
                }}
            />
            <Stack padding gap background="level2" borderRadius="xs">
                <Stack gap horizontal justifyContent="spaceBetween">
                    <Stack horizontal gap>
                        <Button onClick={onPrependClick}>Prepend messages</Button>
                        <Button onClick={onAppendClick}>Append messages</Button>
                        <Button onClick={onAppendNew}>Append and scroll</Button>
                    </Stack>
                    <Stack>
                        <Button onClick={onResetClick}>Reset</Button>
                    </Stack>
                </Stack>
                <Stack>
                    <Paragraph>num: {list.length}</Paragraph>
                </Stack>
            </Stack>
        </Stack>
    )
}
