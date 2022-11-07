import { render, screen } from '@testing-library/react'
import React from 'react'
import { MessageContent, MessageType, ZTEvent } from 'use-zion-client'
import { describe, expect, test, vi } from 'vitest'
import * as Zion from 'use-zion-client'
import { RenderEvent, RenderEventType } from '../hooks/useGroupEvents'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { MessageTimelineItem } from './TimelineItem'

vi.mock('use-zion-client', async () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((await vi.importActual('use-zion-client')) as any),
        useSpaceMembers: () => ({ members: [] }),
        useSpaceData: () => ({ channelGroups: [] }),
    }
})

function generateMessage(events: MessageContent): RenderEvent {
    return {
        type: RenderEventType.UserMessageGroup,
        key: '',
        events: events.map((e: MessageContent) => generateEvent(e)),
    }
}

function generateEvent(content: MessageContent) {
    return {
        eventId: '',
        eventType: ZTEvent.RoomMessage,
        originServerTs: 0,
        fallbackContent: '',
        isLocalPending: false,
        content: {
            kind: ZTEvent.RoomMessage,
            sender: {
                id: '',
                displayName: 'beavis',
            },
            body: content.body,
            msgType: content.msgType,
            content,
        },
    }
}

const Wrapper = ({ events }: { events: MessageContent[] }) => {
    return (
        <Zion.ZionContextProvider disableEncryption homeServerUrl="">
            <MessageTimelineContext.Provider
                value={{
                    userId: '',
                    spaceId: {
                        slug: '',
                        matrixRoomId: '',
                    },
                    channels: [],
                    channelId: {
                        slug: '',
                        matrixRoomId: '',
                    },
                    events: [],
                    messageRepliesMap: {},
                    messageReactionsMap: {},
                    timelineActions: {
                        editingMessageId: '',
                        onSelectEditingMessage: () => null,
                        onCancelEditingMessage: () => null,
                    },
                    handleReaction: () => null,
                    sendReadReceipt: () => new Promise(() => null),
                    type: MessageTimelineType.Channel,
                    members: [],
                    membersMap: {},
                }}
            >
                <MessageTimelineItem itemData={generateMessage(events)} />
            </MessageTimelineContext.Provider>
        </Zion.ZionContextProvider>
    )
}

describe('#TimelineItem', () => {
    test('it should render text messages', async () => {
        render(
            <Wrapper
                events={[
                    {
                        body: 'do you like dogs? check out [www.dogs.com](https://www.dogs.com/)',
                    },
                ]}
            />,
        )
        await screen.findByText(/do you like dogs/)
        const link = screen.getByRole('link')
        // TODO: figure out why we need to ignore - see vitest.setup.ts
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(link).toHaveAttribute('href', 'https://www.dogs.com/')
    })

    // todo as need to mock getBoundingClientRect()
    test.skip('it should render image messages', async () => {
        render(
            <Wrapper
                events={[
                    {
                        body: 'The Office Crying GIF',
                        msgtype: MessageType.Image,
                        url: 'https://media0.giphy.com/media/pynZagVcYxVUk/giphy.gif?cid=9e9e0d5019cpfxozhrqwk79csm347av0gzq3ejxup6lneqgv&rid=giphy.gif&ct=g',
                        info: {
                            h: 250,
                            mimetype: 'image/gif',
                            size: 929864,
                            thumbnail_info: {
                                h: 250,
                                mimetype: 'image/gif',
                                size: 929864,
                                w: 250,
                            },
                            thumbnail_url:
                                'https://media0.giphy.com/media/pynZagVcYxVUk/giphy.gif?cid=9e9e0d5019cpfxozhrqwk79csm347av0gzq3ejxup6lneqgv&rid=giphy.gif&ct=g',
                            w: 250,
                        },
                    },
                ]}
            />,
        )
    })

    test('it should render unfurled content in <MessageZionText>', async () => {
        render(
            <Wrapper
                events={[
                    {
                        body: 'do you like dogs? check out [www.dogs.com](https://www.dogs.com/)',
                        msgType: MessageType.ZionText,
                        attachments: [
                            {
                                url: 'http://example.com',
                            },
                        ],
                    },
                ]}
            />,
        )
        await screen.findByText(/do you like dogs/)
        const link = screen.getByRole('link')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(link).toHaveAttribute('href', 'https://www.dogs.com/')
    })
})
