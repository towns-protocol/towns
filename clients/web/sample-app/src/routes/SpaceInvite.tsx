import React, { useCallback } from 'react'
import { useSpaceData, useTownsClient } from 'use-towns-client'
import { useNavigate } from 'react-router-dom'

import { MintMembershipToAddressForm } from '@components/mintMembershipToAddressForm'
import { GetSigner, WalletReady } from '@components/WalletReady'
import { InviteForm } from '../components/InviteForm'

export function SpaceInvite() {
    const space = useSpaceData()
    const navigate = useNavigate()
    const { inviteUser, spaceDapp } = useTownsClient()

    const onClickSendInvite = useCallback(
        async (spaceId: string, inviteeId: string) => {
            await inviteUser(spaceId, inviteeId)
            navigate('/spaces/' + spaceId + '/')
        },
        [inviteUser, navigate],
    )

    const onClickCancel = useCallback(async () => {
        navigate('/spaces/' + space?.id + '/')
    }, [navigate, space?.id])

    const onClickMintMembership = useCallback(
        async (spaceId: string, walletAddress: string, getSigner: GetSigner) => {
            if (!spaceDapp) {
                console.error('No spaceDapp found')
                return
            }
            const signer = await getSigner()
            if (!signer) {
                console.error('No signer found')
                return
            }
            const { issued } = await spaceDapp.joinSpace(spaceId, walletAddress, signer)
            console.log('::transaction::', issued)
        },
        [spaceDapp],
    )

    return space ? (
        <>
            <WalletReady>
                {({ getSigner }) => (
                    <MintMembershipToAddressForm
                        spaceId={space.id}
                        spaceName={space.name}
                        mintMembership={(spaceId, walletAddress) =>
                            onClickMintMembership(spaceId, walletAddress, getSigner)
                        }
                        onClickCancel={onClickCancel}
                    />
                )}
            </WalletReady>
            <InviteForm
                isSpace
                streamId={space.id}
                streamName={space.name}
                sendInvite={onClickSendInvite}
                onClickCancel={onClickCancel}
            />
        </>
    ) : (
        <div>
            <h2>Space Not Found</h2>
        </div>
    )
}
