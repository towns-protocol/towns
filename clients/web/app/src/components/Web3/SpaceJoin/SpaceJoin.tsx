import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier, makeRoomIdentifier, useWeb3Context, useZionClient } from 'use-zion-client'
import { useAccount } from 'wagmi'
import { Box, Button, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { useAuth } from 'hooks/useAuth'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import 'wagmi/window'

export type JoinData = {
    name: string
    networkId: string
    spaceAddress?: string
}

type ModalProps = {
    onHide: () => void
    onCancel: () => void
    onJoin: () => void
    // we don't have access to matrix room data - we haven't joined the room yet - this joinData comes from contract
    joinData?: JoinData
    notEntitled: boolean
    maxLimitReached: boolean
}

const SpaceJoinModal = (props: ModalProps) => {
    const data = props.joinData
    const { logout } = useAuth()
    const initialSyncComplete = useWaitForInitialSync()
    const { address } = useAccount()

    const onSwitchWallet = useCallback(async () => {
        await logout()
        // save this in the url so InviteLinkLanding can pick it up
        window.history.replaceState(null, '', `?invite&invalidWallet=${address}`)
        // triggers MM prompt to user to connect with different wallet, after connecting, they still have to change their account
        try {
            await window.ethereum?.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            })
        } catch (error) {
            console.error(error)
        }
    }, [address, logout])

    if (!data) {
        return null
    }

    const notAllowd = props.notEntitled || props.maxLimitReached

    return (
        <ModalContainer minWidth="420" onHide={props.onHide}>
            <Stack
                centerContent
                gap="lg"
                padding={{
                    default: 'lg',
                    touch: 'none',
                }}
            >
                {notAllowd ? (
                    <>
                        <Box position="relative">
                            <InteractiveSpaceIcon
                                spaceId={data.networkId}
                                size="sm"
                                spaceName={data.name}
                                address={data.spaceAddress}
                            />
                            <Box
                                position="absolute"
                                rounded="full"
                                background="level1"
                                style={{
                                    top: 1,
                                    right: 1,
                                    width: '30px',
                                    height: '30px',
                                }}
                            />
                            <Box position="absolute" top="none" right="none">
                                <Icon type="alert" color="error" size="square_lg" />
                            </Box>
                        </Box>
                        <Box centerContent gap="lg" padding="md" maxWidth="420">
                            <Heading textAlign="center" level={2}>
                                Unable to join <br /> {data.name}
                            </Heading>

                            <Box maxWidth="350" paddingTop="sm">
                                <Text textAlign="center" color="gray2" size="lg">
                                    {props.notEntitled &&
                                        "You don't have permission to join this town because we were unable to verify the required assets in your wallet."}
                                    {props.maxLimitReached &&
                                        'You are unable to join because this town has reached its capacity.'}
                                </Text>
                            </Box>
                        </Box>
                        <Box gap="sm">
                            <Button
                                animate={false}
                                tone="cta1"
                                minWidth="200"
                                onClick={props.onHide}
                            >
                                <Text>OK</Text>
                            </Button>

                            {props.notEntitled && (
                                <Button
                                    animate={false}
                                    tone="none"
                                    size="button_sm"
                                    style={{
                                        boxShadow: 'none',
                                    }}
                                    onClick={onSwitchWallet}
                                >
                                    <Text size="sm" color="gray1">
                                        Switch Wallet
                                    </Text>
                                </Button>
                            )}
                        </Box>
                    </>
                ) : (
                    <>
                        <Box maxWidth="350">
                            <Paragraph textAlign="center">Welcome to</Paragraph>
                            <Heading level={2} textAlign="center">
                                {data.name}
                            </Heading>
                        </Box>
                        <InteractiveSpaceIcon
                            size="lg"
                            spaceName={data.name}
                            spaceId={data.networkId}
                            address={data.spaceAddress}
                        />
                        <Box gap="sm">
                            <Button
                                tone="cta1"
                                disabled={!initialSyncComplete}
                                onClick={props.onJoin}
                            >
                                {!initialSyncComplete ? (
                                    <>
                                        <ButtonSpinner />
                                        <Text>Connecting to server</Text>
                                    </>
                                ) : (
                                    <Text>Join {data.name}</Text>
                                )}
                            </Button>
                            <Button
                                tone="none"
                                size="button_sm"
                                style={{
                                    boxShadow: 'none',
                                }}
                                onClick={props.onCancel}
                            >
                                <Text size="sm" color="gray1">
                                    No thanks
                                </Text>
                            </Button>
                        </Box>
                    </>
                )}
            </Stack>
        </ModalContainer>
    )
}

export type Props = {
    joinData: JoinData
    // if matrix invitation (as opposed to invite link), user can decline to remove from their invite list
    onCancel?: () => void
    onSuccessfulJoin?: () => void
}

export const SpaceJoin = (props: Props) => {
    const { onSuccessfulJoin, joinData, onCancel } = props
    const [modal, setModal] = useState(true)
    const navigate = useNavigate()
    const { client } = useZionClient()
    const [notEntitled, setNotEntitled] = useState(false)
    const [maxLimitReached, setMaxLimitReached] = useState(false)
    const { signer } = useWeb3Context()

    // TODO: use this to check if user is entitled to join before trying to join (join v2)
    // const { data: userIsEntitled } = useUserIsEntitledByTokenBalance(joinData.networkId)

    const joinSpace = useCallback(async () => {
        if (!client) {
            return
        }
        if (joinData?.networkId) {
            const roomIdentifier: RoomIdentifier = makeRoomIdentifier(joinData.networkId)

            try {
                // use client.joinRoom b/c it will throw an error, not the joinRoom wrapped in useWithCatch()
                const result = await client.joinTown(roomIdentifier, signer)
                if (!result) {
                    setNotEntitled(true)
                } else {
                    onSuccessfulJoin?.()
                }
            } catch (error) {
                if ((error as Error)?.message?.includes('has exceeded the member cap')) {
                    setMaxLimitReached(true)
                } else {
                    setNotEntitled(true)
                }
            }
        }
    }, [client, joinData.networkId, signer, onSuccessfulJoin])

    const onHide = useCallback(() => {
        setModal(false)
        navigate('/')
    }, [navigate])

    const _onCancel = useCallback(() => {
        onCancel?.()
        onHide()
    }, [onCancel, onHide])

    return (
        <Box centerContent absoluteFill data-testid="space-join">
            {modal && (
                <SpaceJoinModal
                    joinData={joinData}
                    notEntitled={notEntitled}
                    maxLimitReached={maxLimitReached}
                    onHide={onHide}
                    onCancel={_onCancel}
                    onJoin={joinSpace}
                />
            )}
        </Box>
    )
}
