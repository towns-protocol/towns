import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, test } from 'vitest'
import { Membership, SpaceContext } from 'use-zion-client'
import { RichTextEditor } from './RichTextEditor'

const Wrapper = (props: { children?: React.ReactNode }) => {
    const spaceId = {
        slug: '',
        networkId: '',
    }
    return <SpaceContext.Provider value={{ spaceId }}>{props.children}</SpaceContext.Provider>
}

describe('#RichTextEditor editable', () => {
    test('it should display a message', async () => {
        render(
            <Wrapper>
                <RichTextEditor initialValue="welcome!" channels={[]} members={[]} />
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
                    members={[]}
                />
            </Wrapper>,
        )
        expect(screen.getByText('this field is read only')).toBeDefined()
    })

    test('it should not display value if not editable', async () => {
        render(
            <Wrapper>
                <RichTextEditor
                    editable={false}
                    initialValue="welcome!"
                    channels={[]}
                    members={[]}
                />
            </Wrapper>,
        )
        expect(screen.queryByText('welcome!')).toBeNull()
    })
})

describe('#RichTextEditor mention nodes', () => {
    test('it should create a mention node', async () => {
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue="welcome! @ben"
                    channels={[]}
                    members={[
                        {
                            name: 'ben',
                            displayName: 'ben',
                            userId: '1',
                            membership: Membership.Join,
                            disambiguate: false,
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
                    members={[
                        {
                            name: 'user1',
                            displayName,
                            userId: '1',
                            membership: Membership.Join,
                            disambiguate: false,
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
                    members={[
                        {
                            displayName,
                            userId: '1',
                            membership: Membership.Join,
                            name: 'name1',
                            disambiguate: false,
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
