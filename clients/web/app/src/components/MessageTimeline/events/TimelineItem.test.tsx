import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MessageContent, MessageType, ZTEvent } from 'use-zion-client'
import { describe, expect, test, vi } from 'vitest'
import { TestApp } from 'test/testUtils'
import { RenderEvent, RenderEventType } from '../util/getEventsByDate'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { MessageTimelineItem } from './TimelineItem'
import { image, normal, twitter } from '../../../../mocks/unfurl/data'

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
        type: RenderEventType.UserMessages,
        key: '',
        events: events.map((e: MessageContent) => generateEvent(e)),
    }
}

function generateEvent(content: MessageContent) {
    return {
        eventId: 'event-id',
        eventType: ZTEvent.RoomMessage,
        originServerTs: 0,
        fallbackContent: '',
        isLocalPending: false,
        content: {
            kind: ZTEvent.RoomMessage,
            sender: {
                id: 'sender-id',
                displayName: 'beavis',
            },
            body: content.body,
            msgType: content.msgtype,
            content,
        },
    }
}

const Wrapper = ({ events }: { events: MessageContent[] }) => {
    return (
        <TestApp>
            <MessageTimelineContext.Provider
                value={{
                    userId: '',
                    spaceId: {
                        slug: '',
                        networkId: '',
                    },
                    channels: [],
                    channelId: {
                        slug: '',
                        networkId: '',
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
        </TestApp>
    )
}

describe('#TimelineItem', () => {
    test('it should render MessageType.Text messages', async () => {
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

        expect(link).toHaveAttribute('href', 'https://www.dogs.com/')
    })

    test('it should render MessageType.Image messages', async () => {
        const url =
            'https://media0.giphy.com/media/pynZagVcYxVUk/giphy.gif?cid=9e9e0d5019cpfxozhrqwk79csm347av0gzq3ejxup6lneqgv&rid=giphy.gif&ct=g'
        render(
            <Wrapper
                events={[
                    {
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
                    },
                ]}
            />,
        )
        const backgroundImageNode = await screen.findByTestId('ratioed-background-image')
        expect(backgroundImageNode.style.backgroundImage).toEqual(`url(${url})`)
        expect(backgroundImageNode.style.maxWidth).toEqual('250px')
    })

    test('it should render generic unfurled content when a link is present', async () => {
        render(
            <Wrapper
                events={[
                    {
                        body: `do you like dogs? check out [this is a link](${normal.url})`,
                    },
                ]}
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
                events={[
                    {
                        body: `do you like dogs? check out [this is a link](${image.url})`,
                    },
                ]}
            />,
        )

        const backgroundImageNode = await screen.findByTestId('ratioed-background-image')
        expect(backgroundImageNode.style.backgroundImage).toEqual(`url(${image.url})`)
        // the width of the image after it's been shrunk by the ratioed background image
        expect(backgroundImageNode.style.maxWidth).toEqual('312px')
    })

    test('it should render twitter content when a twitter link is present', async () => {
        const { info: twitterInfo } = twitter
        const author = twitterInfo.includes.users[0]
        render(
            <Wrapper
                events={[
                    {
                        body: `[some tweet link](${twitter.url})`,
                    },
                ]}
            />,
        )

        await screen.findAllByAltText(twitterInfo.includes.users[0].username)
        const authorLink = screen.getByRole('link', {
            name: `${author.name} @${author.username}`,
        })
        expect(authorLink).toHaveAttribute('href', `https://twitter.com/${author.username}`)

        expect(
            screen.getByLabelText(`${twitterInfo.includes.media[0].url}:small`),
        ).toBeInTheDocument()

        expect(
            screen.getByText(/The Nets have suspended Kyrie Irving/, { exact: false }),
        ).toBeInTheDocument()

        expect(screen.getByText(/2.2K Retweets/, { exact: false })).toBeInTheDocument()
        expect(screen.getByText(/23K Likes/, { exact: false })).toBeInTheDocument()
        expect(screen.getByText(/Nov, 3 2022/, { exact: false })).toBeInTheDocument()
    })
})
