import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import {
    MessageType,
    RoomMessageEvent,
    RoomMessageEventContentOneOf,
    ZTEvent,
} from 'use-towns-client'
import { describe, expect, test, vi } from 'vitest'
import { TestApp } from 'test/testUtils'
import { image, normal, twitter } from '../../../mocks/unfurl/data'
import {
    MessageTimelineContext,
    MessageTimelineType,
} from '../MessageTimeline/MessageTimelineContext'
import { MessageRenderEvent, RenderEventType } from '../MessageTimeline/util/getEventsByDate'
import { MessageTimelineItem } from './TimelineItem'

interface MessageContent {
    msgtype?: MessageType
    content?: RoomMessageEventContentOneOf
    body: string
}

vi.mock('use-towns-client', async () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((await vi.importActual('use-towns-client')) as any),
        useSpaceMembers: () => ({ members: [] }),
        useSpaceData: () => ({ channelGroups: [] }),
    }
})

function generateMessageRenderEvent(messageContent: MessageContent): MessageRenderEvent {
    return {
        type: RenderEventType.Message,
        key: 'string',
        displayContext: 'single',
        isHighlight: false,
        event: {
            eventId: 'event-id',
            eventNum: 0n,
            createdAtEpocMs: 0,
            fallbackContent: '',
            isLocalPending: false,
            isEncrypting: false,
            isMentioned: false,
            isRedacted: false,
            isSendFailed: false,
            content: generateRoomMessageEvent(messageContent),
            sender: {
                id: 'sender-id',
                displayName: 'beavis',
            },
        },
    }
}

function generateRoomMessageEvent(messageContent: MessageContent): RoomMessageEvent {
    return {
        kind: ZTEvent.RoomMessage,
        body: messageContent.body,
        mentions: [],
        content: messageContent.content ?? { msgType: MessageType.Text },
    }
}

const Wrapper = ({ messageContent }: { messageContent: MessageContent }) => {
    return (
        <TestApp>
            <MessageTimelineContext.Provider
                value={{
                    userId: '',
                    spaceId: '',
                    isChannelEncrypted: false,
                    channels: [],
                    channelId: '',
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
                <MessageTimelineItem itemData={generateMessageRenderEvent(messageContent)} />
            </MessageTimelineContext.Provider>
        </TestApp>
    )
}

describe('#TimelineItem', () => {
    test('it should render MessageType.Text messages', async () => {
        render(
            <Wrapper
                messageContent={{
                    body: 'do you like dogs? check out [www.dogs.com](https://www.dogs.com/)',
                }}
            />,
        )
        await screen.findByText(/do you like dogs/)
        const link = screen.getAllByRole('link').find((link) => link.textContent === 'www.dogs.com')

        expect(link).toHaveAttribute('href', 'https://www.dogs.com/')
    })

    test('it should render MessageType.Image messages', async () => {
        const url =
            'https://media0.giphy.com/media/pynZagVcYxVUk/giphy.gif?cid=9e9e0d5019cpfxozhrqwk79csm347av0gzq3ejxup6lneqgv&rid=giphy.gif&ct=g'
        render(
            <Wrapper
                messageContent={{
                    body: 'The Office Crying GIF',
                    content: {
                        msgType: MessageType.Image,
                        info: {
                            url: url,
                            height: 250,
                            width: 250,
                            mimetype: 'image/gif',
                            size: 929864,
                        },
                        thumbnail: {
                            url: url,
                            height: 250,
                            width: 250,
                            mimetype: 'image/gif',
                            size: 929864,
                        },
                    },
                }}
            />,
        )
        const backgroundImageNode = await screen.findByTestId('ratioed-background-image')
        expect(backgroundImageNode.style.backgroundImage).toEqual(`url(${url})`)
        expect(backgroundImageNode.style.maxWidth).toEqual('250px')
    })

    test('it should render generic unfurled content when a link is present', async () => {
        render(
            <Wrapper
                messageContent={{
                    body: `do you like dogs? check out [this is a link](${normal.url})`,
                }}
            />,
        )

        await waitFor(() => {
            expect(screen.getByTestId('unfurled-generic-block')).toBeInTheDocument()
        })

        expect(screen.getByTitle(normal.title)).toBeInTheDocument()
        expect(screen.getByText(normal.title)).toBeInTheDocument()
        expect(screen.getByText(normal.description)).toBeInTheDocument()
    })

    test('it should render an image when an image url is present', async () => {
        render(
            <Wrapper
                messageContent={{
                    body: `do you like dogs? check out [this is a link](${image.url})`,
                }}
            />,
        )

        const backgroundImageNode = await screen.findByTestId('ratioed-background-image')
        expect(backgroundImageNode.style.backgroundImage).toEqual(`url(${image.url})`)
        // the width of the image after it's been shrunk by the ratioed background image
        expect(backgroundImageNode.style.maxWidth).toEqual('312px')
    })

    test('it should render twitter content when a twitter link is present', async () => {
        const { info: twitterInfo } = twitter
        // const author = twitterInfo.includes.users[0]
        render(
            <Wrapper
                messageContent={{
                    body: `[some tweet link](${twitter.url})`,
                }}
            />,
        )

        await screen.findAllByAltText(twitterInfo.includes.users[0].username)

        expect(
            screen.getByLabelText(`${twitterInfo.includes.media[0].url}:small`),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/The Nets have suspended Kyrie Irving/, { exact: false }),
        ).toBeInTheDocument()

        expect(screen.getByText(/2.2K Retweets/, { exact: false })).toBeInTheDocument()
        expect(screen.getByText(/23K Likes/, { exact: false })).toBeInTheDocument()
        expect(screen.getByTestId('twitter-date')).toBeInTheDocument()
    })
})
