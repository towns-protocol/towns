/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group dendrite
 */
import { Membership, RoomMember } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZTEvent } from '../../src/types/timeline-types'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useUserLookupContext } from '../../src/components/UserLookupContext'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('userProfileHooks', () => {
    // TODO: https://linear.app/hnt-labs/issue/HNT-1651/testsintegrationuserprofilehookstesttsx
    test.skip('user can join a room, see username and avatar info', async () => {
        // create clients
        const { alice } = await registerAndStartClients(['alice'])

        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // alice needs funds to create a space
        await alice.fundWallet()
        // create a space
        const alicesSpaceId = (await createTestSpaceGatedByTownNft(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('alices space'),
            },
        )) as RoomIdentifier

        // set display name and avatar
        await alice.setDisplayName(alicesSpaceId.networkId, "Alice's your aunt")
        await alice.setAvatarUrl('alice.png')

        //
        const alicesChannelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: alicesSpaceId,
            roleIds: [],
        })) as RoomIdentifier
        // create a veiw for bob
        const TestUserProfile = () => {
            const { setDisplayName, setAvatarUrl } = useZionClient()
            const myProfile = useMyProfile()
            const { usersMap } = useUserLookupContext()
            const userId = alice.getUserId()
            const alicesMemberInfo = userId ? usersMap[userId] : undefined
            const { timeline } = useChannelTimeline()
            const roomMessages = timeline.filter((x) => x.content?.kind === ZTEvent.RoomMessage)
            const onClickSetProfileInfo = useCallback(() => {
                void (async () => {
                    await setDisplayName(alicesSpaceId.networkId, "Bob's your uncle")
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
                        {roomMessages[0]?.content?.kind === ZTEvent.RoomMessage
                            ? roomMessages[0].sender.displayName
                            : 'none'}
                    </div>
                    <div data-testid="allMessages">
                        {timeline
                            .map((m) => `${m.content?.kind ?? 'none'} ${m.fallbackContent}`)
                            .join('\n')}
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
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // wait for the channel join
        await waitFor(() => expect(channelMembership).toHaveTextContent(Membership.Join))
        // verify alice name is rendering
        await waitFor(() => expect(alicesMemberName).toHaveTextContent("Alice's your aunt"))
        // verify alice avatar is rendering
        await waitFor(() => expect(alicesMemberAvatar).toHaveTextContent('alice.png'))
        // have bob send a message to jane
        fireEvent.click(setProfileInfoButton)
        // verify my (bob) name is rendering
        await waitFor(() => expect(myProfileName).toHaveTextContent("Bob's your uncle"))
        // verify my (bob) avatar is rendering
        await waitFor(() => expect(myProfileAvatar).toHaveTextContent('bob.png'))
        // double check that alice sees the same info
        await waitFor(() =>
            expect(
                alice
                    .getRoomData(alicesChannelId)
                    ?.members.some((x: RoomMember) => x.name === "Bob's your uncle"),
            ).toBe(true),
        )
        // have alice send a message
        await alice.sendMessage(alicesChannelId, 'hello')
        // expect a result
        await waitFor(() => expect(messageSender).toHaveTextContent("Alice's your aunt"))
    }) // end test with bob
}) // end describe
