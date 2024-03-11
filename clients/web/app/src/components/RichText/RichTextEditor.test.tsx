import { render, screen } from '@testing-library/react'
import React from 'react'
import { UserLookupContext } from 'use-towns-client/dist/components/UserLookupContext'
import { ChannelContextProvider, SpaceContextProvider, TownsContext } from 'use-towns-client'
import { describe, expect, test } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

const Wrapper = (props: { children: React.ReactElement }) => {
    return (
        <TownsContext.Provider
            value={{
                rooms: {},
                spaceUnreads: {},
                spaceMentions: {},
                spaceUnreadChannelIds: {},
                spaces: [],
                dmUnreadChannelIds: new Set(),
                dmChannels: [],
                clientStatus: {
                    isLocalDataLoaded: false,
                    isRemoteDataLoaded: false,
                    progress: 0,
                    streamSyncActive: false,
                },
                spaceHierarchies: {},
            }}
        >
            <UserLookupContext.Provider
                value={{ streamId: '', spaceId: '', users: [], usersMap: {} }}
            >
                <SpaceContextProvider spaceId="">
                    <ChannelContextProvider channelId="">{props.children}</ChannelContextProvider>
                </SpaceContextProvider>
            </UserLookupContext.Provider>
        </TownsContext.Provider>
    )
}

describe('#RichTextEditor editable', () => {
    test('it should display a message', async () => {
        render(
            <Wrapper>
                <RichTextEditor initialValue="welcome!" channels={[]} users={[]} />
            </Wrapper>,
        )
        await screen.findByText('welcome!')
    })

    test('it should display placeholder if not editable', async () => {
        render(
            <Wrapper>
                <RichTextEditor
                    editable={false}
                    initialValue="welcome!"
                    placeholder="this field is read only"
                    channels={[]}
                    users={[]}
                />
            </Wrapper>,
        )
        expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false')
    })
})

describe('#RichTextEditor mention nodes', () => {
    test('it should create a mention node', async () => {
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue="welcome! @ben"
                    channels={[]}
                    users={[
                        {
                            username: 'ben',
                            usernameConfirmed: true,
                            usernameEncrypted: false,
                            displayName: 'ben',
                            displayNameEncrypted: false,
                            userId: '1',
                        },
                    ]}
                />
            </Wrapper>,
        )
        const node = await screen.findByTestId('mention-node')
        expect(node).toHaveTextContent('@ben')
        expect(node.getAttribute('data-mention-name')).toEqual('@ben')
        expect(node.getAttribute('data-user-id')).toEqual('1')
    })

    test('it should create a mention node even when the user has RegExp characters included', async () => {
        const displayName = 'ben****'
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue={`welcome! @${displayName}`}
                    channels={[]}
                    users={[
                        {
                            username: 'user1',
                            usernameConfirmed: true,
                            usernameEncrypted: false,
                            displayName,
                            displayNameEncrypted: false,
                            userId: '1',
                        },
                    ]}
                />
            </Wrapper>,
        )
        const node = await screen.findByTestId('mention-node')
        expect(node).toHaveTextContent(displayName)
        expect(node.getAttribute('data-mention-name')).toEqual(`@${displayName}`)
        expect(node.getAttribute('data-user-id')).toEqual('1')
    })

    test('it should create a mention instead of markdown', async () => {
        const displayName = '[ben](https://ben)'
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue={`welcome! @${displayName}`}
                    channels={[]}
                    users={[
                        {
                            displayName,
                            displayNameEncrypted: false,
                            userId: '1',
                            username: 'name1',
                            usernameConfirmed: true,
                            usernameEncrypted: false,
                        },
                    ]}
                />
            </Wrapper>,
        )
        const node = await screen.findByTestId('mention-node')
        expect(node).toHaveTextContent(displayName)
        expect(node.getAttribute('data-mention-name')).toEqual(`@${displayName}`)
        expect(node.getAttribute('data-user-id')).toEqual('1')
    })
})
