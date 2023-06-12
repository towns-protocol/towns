/**
 * @group dendrite
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AutojoinChannels } from '../../src/components/AutojoinChannels'
import { LoginStatus } from '../../src/hooks/login'
import { Permission } from '../../src/client/web3/ContractTypes'
import React, { useCallback } from 'react'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { useMembers } from '../../src/hooks/use-members'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { LoginWithWallet } from './helpers/TestComponents'

describe('<AutojoinChannels />', () => {
    test('create a space with two users, have alice create channels, ensure bob automatically joins them', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = await createTestSpaceWithZionMemberRole(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            [],
            {
                name: makeUniqueName('bobs space'),
                visibility: RoomVisibility.Public,
            },
        )

        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        // stop bob, we'll be using him in the react component
        await bob.stopClients()
        // alice joins the room
        await alice.joinRoom(spaceId)

        // have alice create a channel
        const firstChannel = await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!firstChannel) {
            throw new Error('firstChannel is undefined')
        }

        const MembersComponent = ({ roomId }: { roomId: RoomIdentifier }) => {
            const { members } = useMembers(roomId)
            const match = members?.find((member) => member.userId === bob.getUserId())
            return <>{match && <div data-testid="bob-joined">'bob joined'</div>}</>
        }

        // create a power levels view for bob
        const SpaceChannelsContent = () => {
            const { leaveRoom } = useZionClient()
            const space = useSpaceData()

            const onLeave = useCallback(() => {
                void leaveRoom?.(firstChannel)
            }, [leaveRoom])

            // content
            return (
                <>
                    <AutojoinChannels />
                    <button data-testid="leaveButton" onClick={onLeave}>
                        leave first channel
                    </button>
                    <LoginWithWallet />
                    <div data-testid="spaceId">{space?.id.networkId}</div>
                    <div data-testid="spaceChildCount">
                        {space?.channelGroups && space?.channelGroups?.length > 0
                            ? space?.channelGroups[0].channels.length.toString()
                            : 'undefined'}
                    </div>
                    <div>
                        {space?.channelGroups && space?.channelGroups?.length > 0 ? (
                            <div data-testid="members">
                                {space?.channelGroups[0].channels.map((channel) => {
                                    return (
                                        <div key={channel.id.networkId}>
                                            <MembersComponent roomId={channel.id} />
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            'undefined'
                        )}
                    </div>
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={bob.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <SpaceChannelsContent />
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // gather our test elements
        const loginStatus = screen.getByTestId('loginStatus')
        const spaceChildCount = screen.getByTestId('spaceChildCount')
        const leaveChannelButton = screen.getByTestId('leaveButton')
        // wait for registration
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))

        // expect the initial space child count to include the channel alice created and the default channel
        await waitFor(() => expect(spaceChildCount).toHaveTextContent('2'))

        // bob should auto joined the previously created channel when he loads the app
        await waitFor(() => expect(screen.getAllByTestId('bob-joined')).toHaveLength(2))

        // have alice create another channel
        await createTestChannelWithSpaceRoles(alice, {
            name: 'second channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        // wait for the space child count to change
        await waitFor(() => expect(spaceChildCount).toHaveTextContent('3'))

        // bob should auto join this channel too
        await waitFor(() => expect(screen.getAllByTestId('bob-joined')).toHaveLength(3))

        fireEvent.click(leaveChannelButton)

        // bob should no longer be in the first channel
        await waitFor(() => expect(screen.getAllByTestId('bob-joined')).toHaveLength(2))

        // have alice create a 3rd channel
        await createTestChannelWithSpaceRoles(alice, {
            name: 'second channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        // out of 4 channels, bob should only be in 3
        await waitFor(() => expect(spaceChildCount).toHaveTextContent('4'))
        await waitFor(() => expect(screen.getAllByTestId('bob-joined')).toHaveLength(3))

        // TODO: test banning when implemented
        // await alice.banUser(channelId, bob.matrixUserId)
        // await waitFor(() => expect(screen.getAllByTestId('bob-joined')).toHaveLength(1))
    })
})
