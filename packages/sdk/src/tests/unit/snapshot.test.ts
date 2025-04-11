import { describe, test, expect } from 'vitest'
import { ethers } from 'ethers'
import { create } from '@bufbuild/protobuf'
import {
    StreamEventSchema,
    UserPayloadSchema,
    MembershipOp,
    UserPayload_UserMembershipSchema,
    StreamEvent,
} from '@towns-protocol/proto'
import { updateSnapshot, findUserMembership, makeGenesisSnapshot } from '../../snapshot'
import { makeUserStreamId, streamIdAsBytes, streamIdFromBytes } from '../../id'
import { bin_fromHexString, bin_toHexString } from '@towns-protocol/dlog'

const AES_GCM_DERIVED_ALGORITHM = 'r.aes-256-gcm.derived'

// Helper functions to match Go test helpers
function makeUserInception(streamId: Uint8Array): StreamEvent {
    return create(StreamEventSchema, {
        creatorAddress: streamId,
        payload: {
            case: 'userPayload',
            value: {
                content: {
                    case: 'inception',
                    value: {
                        streamId,
                        settings: {
                            disableMiniblockCreation: false,
                        },
                    },
                },
            },
        },
    })
}

function makeSpaceInception(streamId: Uint8Array): StreamEvent {
    return create(StreamEventSchema, {
        creatorAddress: streamId,
        payload: {
            case: 'spacePayload',
            value: {
                content: {
                    case: 'inception',
                    value: {
                        streamId,
                        settings: {
                            disableMiniblockCreation: false,
                        },
                    },
                },
            },
        },
    })
}

function makeUserMembership(wallet: ethers.Wallet, membershipOp: MembershipOp) {
    const streamId = makeUserStreamId(wallet.address)
    return create(StreamEventSchema, {
        creatorAddress: bin_fromHexString(wallet.address),
        payload: {
            case: 'userPayload',
            value: create(UserPayloadSchema, {
                content: {
                    case: 'userMembership',
                    value: create(UserPayload_UserMembershipSchema, {
                        streamId: streamIdAsBytes(streamId),
                        op: membershipOp,
                        inviter: bin_fromHexString(wallet.address),
                    }),
                },
            }),
        },
    })
}

function makeSpaceMembership(wallet: ethers.Wallet, membershipOp: MembershipOp) {
    return create(StreamEventSchema, {
        creatorAddress: bin_fromHexString(wallet.address),
        payload: {
            case: 'memberPayload',
            value: {
                content: {
                    case: 'membership',
                    value: {
                        op: membershipOp,
                        userAddress: bin_fromHexString(wallet.address),
                        initiatorAddress: bin_fromHexString(wallet.address),
                    },
                },
            },
        },
    })
}

function makeSpaceUsername(wallet: ethers.Wallet, username: string) {
    return create(StreamEventSchema, {
        creatorAddress: bin_fromHexString(wallet.address),
        payload: {
            case: 'memberPayload',
            value: {
                content: {
                    case: 'username',
                    value: { ciphertext: username },
                },
            },
        },
    })
}

function makeSpaceDisplayName(wallet: ethers.Wallet, displayName: string) {
    return create(StreamEventSchema, {
        creatorAddress: bin_fromHexString(wallet.address),
        payload: {
            case: 'memberPayload',
            value: {
                content: {
                    case: 'displayName',
                    value: { ciphertext: displayName },
                },
            },
        },
    })
}

function makeSpaceImage(wallet: ethers.Wallet, ciphertext: string) {
    return create(StreamEventSchema, {
        creatorAddress: bin_fromHexString(wallet.address),
        payload: {
            case: 'spacePayload',
            value: {
                content: {
                    case: 'spaceImage',
                    value: {
                        ciphertext,
                        algorithm: AES_GCM_DERIVED_ALGORITHM,
                    },
                },
            },
        },
    })
}

describe('snapshot', () => {
    test('make genesis snapshot', () => {
        const wallet = ethers.Wallet.createRandom()
        const streamId = makeUserStreamId(wallet.address)
        const inception = makeUserInception(streamIdAsBytes(streamId))

        const snapshot = makeGenesisSnapshot([inception])

        expect(snapshot.content.case).toBe('userContent')
        if (snapshot.content.case === 'userContent') {
            expect(streamIdFromBytes(snapshot.content.value.inception!.streamId)).toBe(streamId)
        }
    })

    test('update user snapshot', () => {
        const wallet = ethers.Wallet.createRandom()
        const streamId = makeUserStreamId(wallet.address)
        const inception = makeUserInception(streamIdAsBytes(streamId))

        const snapshot = makeGenesisSnapshot([inception])

        const membership = makeUserMembership(wallet, MembershipOp.SO_JOIN)
        const updateFn = updateSnapshot(membership, new Uint8Array())
        updateFn?.(snapshot, BigInt(0), BigInt(1))

        expect(snapshot.content.case).toBe('userContent')
        if (snapshot.content.case === 'userContent') {
            const foundMembership = findUserMembership(
                snapshot.content.value.memberships,
                streamIdAsBytes(streamId),
            )
            expect(foundMembership).toBeDefined()
            expect(foundMembership?.op).toBe(MembershipOp.SO_JOIN)
        }
    })

    test('update space snapshot', () => {
        const wallet = ethers.Wallet.createRandom()
        const streamId = makeUserStreamId(wallet.address)
        const inception = makeSpaceInception(streamIdAsBytes(streamId))

        const snapshot = makeGenesisSnapshot([inception])

        // Create and apply events
        const membership = makeSpaceMembership(wallet, MembershipOp.SO_JOIN)
        const username = makeSpaceUsername(wallet, 'bob')
        const displayName = makeSpaceDisplayName(wallet, 'bobIsTheGreatest')
        const imageCiphertext = 'space_image_ciphertext'
        const image = makeSpaceImage(wallet, imageCiphertext)

        const events = [membership, username, displayName, image]
        events.forEach((event, i) => {
            const updateFn = updateSnapshot(event, new Uint8Array())
            updateFn?.(snapshot, BigInt(1), BigInt(3 + i))
        })

        // Verify member updates
        expect(snapshot.members).toBeDefined()
        const member = snapshot.members?.joined[0]
        expect(member).toBeDefined()
        expect(bin_toHexString(member!.userAddress)).toBe(wallet.address.slice(2).toLowerCase())
        expect(member?.username?.data?.ciphertext).toBe('bob')
        expect(member?.displayName?.data?.ciphertext).toBe('bobIsTheGreatest')
        expect(member?.username?.eventNum).toBe(BigInt(4))
        expect(member?.displayName?.eventNum).toBe(BigInt(5))

        // Verify space image
        expect(snapshot.content.case).toBe('spaceContent')
        if (snapshot.content.case === 'spaceContent') {
            expect(snapshot.content.value.spaceImage?.data?.ciphertext).toBe(imageCiphertext)
            expect(snapshot.content.value.spaceImage?.data?.algorithm).toBe(
                AES_GCM_DERIVED_ALGORITHM,
            )
        }
    })

    test('update snapshot fails if inception', () => {
        const wallet = ethers.Wallet.createRandom()
        const streamId = makeUserStreamId(wallet.address)
        const inception = makeUserInception(streamIdAsBytes(streamId))

        const updateFn = updateSnapshot(inception, new Uint8Array())
        expect(updateFn).toBeUndefined()
    })
})
