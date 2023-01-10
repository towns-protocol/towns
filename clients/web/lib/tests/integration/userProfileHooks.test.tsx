/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership, RoomVisibility } from '../../src/types/matrix-types'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomMember } from 'matrix-js-sdk'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZTEvent } from '../../src/types/timeline-types'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useMember } from '../../src/hooks/use-member'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('userProfileHooks', () => {
    test('user can join a room, see username and avatar info', async () => {
        // create clients
        const { alice } = await registerAndStartClients(['alice'])
        // set display name and avatar
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('alice.png')
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // alice needs funds to create a space
        await alice.fundWallet()
        // create a space
        const alicesSpaceId = (await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('alices space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        //
        const alicesChannelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: alicesSpaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier
        // create a veiw for bob
        const TestUserProfile = () => {
            const { setDisplayName, setAvatarUrl } = useZionClient()
            const myProfile = useMyProfile()
            const alicesMemberInfo = useMember(alicesSpaceId, alice.matrixUserId)
            const timeline = useChannelTimeline()
            const roomMessages = timeline.filter((x) => x.eventType === ZTEvent.RoomMessage)
            const onClickSetProfileInfo = useCallback(() => {
                void (async () => {
                    await setDisplayName("Bob's your uncle")
                    await setAvatarUrl('bob.png')
                })()
            }, [setDisplayName, setAvatarUrl])
            return (
                <>
                    <RegisterAndJoinSpace spaceId={alicesSpaceId} channelId={alicesChannelId} />
                    <button onClick={onClickSetProfileInfo}>Set Profile Info</button>
                    <div data-testid="myProfileName">{myProfile?.displayName ?? 'unknown'}</div>
                    <div data-testid="myProfileAvatar">{myProfile?.avatarUrl ?? 'unknown'}</div>
                    <div data-testid="alicesMemberName">{alicesMemberInfo?.name ?? 'unknown'}</div>
                    <div data-testid="alicesMemberAvatar">
                        {alicesMemberInfo?.avatarUrl ?? 'unknown'}
                    </div>
                    <div data-testid="messageSender">
                        {roomMessages[0]?.content?.kind === 'm.room.message'
                            ? roomMessages[0].content.sender.displayName
                            : 'none'}
                    </div>
                    <div data-testid="allMessages">
                        {timeline.map((m) => `${m.eventType} ${m.fallbackContent}`).join('\n')}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={bobProvider}>
                <SpaceContextProvider spaceId={alicesSpaceId}>
                    <ChannelContextProvider channelId={alicesChannelId}>
                        <TestUserProfile />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const channelMembership = screen.getByTestId('channelMembership') // from RegisterAndJoinSpace
        const myProfileName = screen.getByTestId('myProfileName')
        const myProfileAvatar = screen.getByTestId('myProfileAvatar')
        const alicesMemberName = screen.getByTestId('alicesMemberName')
        const alicesMemberAvatar = screen.getByTestId('alicesMemberAvatar')
        const messageSender = screen.getByTestId('messageSender')
        const setProfileInfoButton = screen.getByRole('button', {
            name: 'Set Profile Info',
        })
        // wait for client to be running
        await waitFor(
            () => expect(clientRunning).toHaveTextContent('true'),
            TestConstants.DefaultWaitForTimeout,
        )
        // wait for the channel join
        await waitFor(
            () => expect(channelMembership).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        // verify alice name is rendering
        await waitFor(
            () => expect(alicesMemberName).toHaveTextContent("Alice's your aunt"),
            TestConstants.DefaultWaitForTimeout,
        )
        // verify alice avatar is rendering
        await waitFor(
            () => expect(alicesMemberAvatar).toHaveTextContent('alice.png'),
            TestConstants.DefaultWaitForTimeout,
        )
        // have bob send a message to jane
        fireEvent.click(setProfileInfoButton)
        // verify my (bob) name is rendering
        await waitFor(
            () => expect(myProfileName).toHaveTextContent("Bob's your uncle"),
            TestConstants.DefaultWaitForTimeout,
        )
        // verify my (bob) avatar is rendering
        await waitFor(
            () => expect(myProfileAvatar).toHaveTextContent('bob.png'),
            TestConstants.DefaultWaitForTimeout,
        )
        // double check that alice sees the same info
        await waitFor(
            () =>
                expect(
                    alice
                        .getRoom(alicesChannelId)
                        ?.getMembers()
                        .some((x: RoomMember) => x.name === "Bob's your uncle"),
                ).toBe(true),
            TestConstants.DefaultWaitForTimeout,
        )
        // have alice send a message
        await alice.sendMessage(alicesChannelId, 'hello')
        // expect a result
        await waitFor(
            () => expect(messageSender).toHaveTextContent("Alice's your aunt"),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test with bob
}) // end describe
