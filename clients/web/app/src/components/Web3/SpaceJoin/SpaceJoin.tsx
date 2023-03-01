import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier, SpaceProtocol, useZionClient } from 'use-zion-client'
import { Box, Button, Heading, Icon, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { SpaceIcon } from '@components/SpaceIcon'
import { useAuth } from 'hooks/useAuth'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'

export type JoinData = {
    name: string
    networkId: string
}

type ModalProps = {
    onHide: () => void
    onCancel: () => void
    onJoin: () => void
    // we don't have access to matrix room data - we haven't joined the room yet - this joinData comes from contract
    joinData?: JoinData
    notEntitled: boolean
}

const SpaceJoinModal = (props: ModalProps) => {
    const data = props.joinData
    const { logout } = useAuth()
    const initialSyncComplete = useWaitForInitialSync()

    if (!data) {
        return null
    }

    return (
        <ModalContainer minWidth="420" onHide={props.onHide}>
            <Stack centerContent gap="lg" padding="lg">
                {props.notEntitled ? (
                    <>
                        <Box position="relative">
                            <SpaceIcon
                                spaceId={data.networkId}
                                width="100"
                                height="100"
                                firstLetterOfSpaceName={data.name[0]}
                                letterFontSize="h1"
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
                                    You don&apos;t have permission to join this space because we
                                    were unable to verify the required assets in your wallet.
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
                            <Button
                                animate={false}
                                tone="none"
                                size="button_sm"
                                style={{
                                    boxShadow: 'none',
                                }}
                                onClick={logout}
                            >
                                <Text size="sm" color="gray1">
                                    Switch Wallet
                                </Text>
                            </Button>
                        </Box>
                    </>
                ) : (
                    <>
                        <Box maxWidth="350">
                            <Heading level={2} textAlign="center">
                                Welcome to <br /> {data.name}
                            </Heading>
                        </Box>
                        <SpaceIcon
                            spaceId={data.networkId}
                            width="250"
                            height="250"
                            firstLetterOfSpaceName={data.name[0]}
                            letterFontSize="display"
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
    const { joinRoom } = useZionClient()
    const [notEntitled, setNotEntitled] = useState(false)

    const joinSpace = useCallback(async () => {
        if (joinData?.networkId) {
            const roomIdentifier: RoomIdentifier = {
                protocol: SpaceProtocol.Matrix,
                slug: encodeURIComponent(joinData.networkId),
                networkId: joinData.networkId,
            }

            const result = await joinRoom(roomIdentifier)
            // a 401 response (not propagated) means the result will be undefined
            // TODO: should the error be propagated?
            if (!result) {
                setNotEntitled(true)
            } else {
                onSuccessfulJoin?.()
            }
        }
    }, [joinData.networkId, joinRoom, onSuccessfulJoin])

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
                    onHide={onHide}
                    onCancel={_onCancel}
                    onJoin={joinSpace}
                />
            )}
        </Box>
    )
}
