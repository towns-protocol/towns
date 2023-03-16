import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import {
    MessageContent,
    MessageType,
    RoomMessageEvent,
    SpaceProtocol,
    ZTEvent,
} from 'use-zion-client'
import { describe, expect, test, vi } from 'vitest'
import { TestApp } from 'test/testUtils'
import { image, normal, twitter } from '../../../../mocks/unfurl/data'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { MessageRenderEvent, RenderEventType } from '../util/getEventsByDate'
import { MessageTimelineItem } from './TimelineItem'

vi.mock('use-zion-client', async () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((await vi.importActual('use-zion-client')) as any),
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
        displayEncrypted: false,
        event: {
            eventId: 'event-id',
            originServerTs: 0,
            fallbackContent: '',
            isLocalPending: false,
            isMentioned: false,
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
        msgType: messageContent.msgtype ?? '',
        mentions: [],
        content: {
            // 4 levels deep
            ...messageContent,
        },
        wireContent: {
            key: '',
        },
    }
}

const Wrapper = ({ messageContent }: { messageContent: MessageContent }) => {
    return (
        <TestApp>
            <MessageTimelineContext.Provider
                value={{
                    userId: '',
                    spaceId: {
                        slug: '',
                        networkId: '',
                        protocol: SpaceProtocol.Matrix,
                    },
                    isChannelEncrypted: false,
                    channels: [],
                    channelId: {
                        slug: '',
                        networkId: '',
                        protocol: SpaceProtocol.Matrix,
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
        const link = screen.getAllByRole('link')[1]

        expect(link).toHaveAttribute('href', 'https://www.dogs.com/')
    })

    test('it should render MessageType.Image messages', async () => {
        const url =
            'https://media0.giphy.com/media/pynZagVcYxVUk/giphy.gif?cid=9e9e0d5019cpfxozhrqwk79csm347av0gzq3ejxup6lneqgv&rid=giphy.gif&ct=g'
        render(
            <Wrapper
                messageContent={{
                    body: 'The Office Crying GIF',
                    msgtype: MessageType.Image,
                    url: url,
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
                        thumbnail_url: url,
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

        expect(screen.getByAltText(normal.title)).toBeInTheDocument()
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
