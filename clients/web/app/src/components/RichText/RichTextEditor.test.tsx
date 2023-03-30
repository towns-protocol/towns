import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, test } from 'vitest'
import { Membership, SpaceProtocol } from 'use-zion-client'
import { SpaceContext } from 'use-zion-client/dist/components/SpaceContextProvider'
import { RichTextEditor } from './RichTextEditor'

const Wrapper = (props: { children?: React.ReactNode }) => {
    const spaceId = {
        slug: '',
        networkId: '',
        protocol: SpaceProtocol.Matrix,
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
        expect(screen.getByText('welcome!')).toBeTruthy()
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
                            userId: '1',
                            membership: Membership.Join,
                            rawDisplayName: '',
                            disambiguate: false,
                        },
                    ]}
                />
            </Wrapper>,
        )
        expect(screen.getByTestId('mention-node')).toHaveTextContent('@ben')
    })

    test('it should create a mention node even when the user has RegExp characters included', async () => {
        const name = 'ben****'
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue={`welcome! @${name}`}
                    channels={[]}
                    members={[
                        {
                            name,
                            userId: '1',
                            membership: Membership.Join,
                            rawDisplayName: '',
                            disambiguate: false,
                        },
                    ]}
                />
            </Wrapper>,
        )
        expect(screen.getByTestId('mention-node')).toHaveTextContent(name)
    })

    test('it should create a mention instead of markdown', async () => {
        const name = '[ben](https://ben)'
        render(
            <Wrapper>
                <RichTextEditor
                    initialValue={`welcome! @${name}`}
                    channels={[]}
                    members={[
                        {
                            name,
                            userId: '1',
                            membership: Membership.Join,
                            rawDisplayName: '',
                            disambiguate: false,
                        },
                    ]}
                />
            </Wrapper>,
        )
        expect(screen.getByTestId('mention-node')).toHaveTextContent(name)
    })
})
