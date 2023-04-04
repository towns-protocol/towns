import React, { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { LoginButton } from '@components/Login/LoginButton/LoginButton'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { Box, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { FadeIn } from '@components/Transitions'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { TownsTokenConfig } from '../components/TownsToken/TownsTokenConfig'

function getButtonLabel(status: SignupButtonStatus) {
    switch (status) {
        case SignupButtonStatus.Register:
            return 'Register'
        case SignupButtonStatus.Login:
            return 'Login to join'
        case SignupButtonStatus.ConnectRequired:
        case SignupButtonStatus.ConnectError:
            return 'Connect Wallet'
        case SignupButtonStatus.FetchingRegistrationStatus:
            return 'Connecting to server'
        default:
            return 'Waiting for approval'
    }
}

const InviteLinkLanding = () => {
    const spaceId = useSpaceIdFromPathname()
    const [searchParams] = useSearchParams()
    const isInvite = searchParams.get('invite') != undefined
    const { data, isLoading } = useContractSpaceInfo(spaceId)
    const setTitle = useSetDocTitle()
    const { data: roomTopic, isLoading: isLoadingRoomTopic } = useGetSpaceTopic(spaceId)

    const {
        walletStatus,
        connect,
        loginStatus,
        login,
        register,
        userOnWrongNetworkForSignIn,
        isConnected,
    } = useAuth()

    const {
        status,
        onClick: onButtonClick,
        isSpinning,
    } = useSignupButton({
        walletStatus,
        loginStatus,
        connect,
        register,
        login,
    })

    const buttonLabel = getButtonLabel(status)
    const { switchNetwork } = useRequireTransactionNetwork()

    useEffect(() => {
        if (!data) {
            return
        }
        setTitle(`Join ${data.name}`)
    }, [data, setTitle])

    const spaceIconSize = TownsTokenConfig.sizes['lg'].containerSize

    if (!isInvite) {
        return <Navigate replace to="/login" />
    }

    return (
        <Stack
            centerContent
            grow
            gap="lg"
            alignSelf="center"
            height="100%"
            maxWidth="420"
            alignItems="center"
        >
            {data && !isLoadingRoomTopic ? (
                <>
                    <InteractiveSpaceIcon
                        spaceId={data.networkId}
                        address={data.address}
                        spaceName={data.name}
                        size="lg"
                    />
                    <Stack gap>
                        <FadeIn>
                            <Paragraph size="lg" textAlign="center">
                                You&apos;re invited to join
                            </Paragraph>
                        </FadeIn>
                        <FadeIn>
                            <Box gap="lg">
                                <Heading level={2} textAlign="center">
                                    {data?.name}
                                </Heading>
                                {roomTopic && (
                                    <Text color="gray1" textAlign="center">
                                        {roomTopic}
                                    </Text>
                                )}
                            </Box>
                        </FadeIn>
                    </Stack>
                </>
            ) : (
                <>
                    {isLoading ? (
                        <>
                            <Box
                                style={{
                                    width: spaceIconSize,
                                    height: spaceIconSize,
                                }}
                            />
                            <Stack gap>
                                <Text>&nbsp;</Text>
                                <Heading level={2}> &nbsp;</Heading>
                            </Stack>
                        </>
                    ) : (
                        <Heading level={3} color="error">
                            Space not found
                        </Heading>
                    )}
                </>
            )}

            <Stack paddingTop="sm" gap="lg" alignItems="center">
                {status === SignupButtonStatus.Register && (
                    <Text color="gray2" size="sm" textAlign="center">
                        Looks like you&apos;re not registered yet. Register now to join.
                    </Text>
                )}

                <LoginButton
                    isConnected={isConnected}
                    userOnWrongNetworkForSignIn={userOnWrongNetworkForSignIn}
                    loading={isSpinning}
                    label={buttonLabel}
                    tone="cta1"
                    onClick={onButtonClick}
                />

                {isConnected && userOnWrongNetworkForSignIn && (
                    <Box paddingTop="md" flexDirection="row" justifyContent="end">
                        <RequireTransactionNetworkMessage
                            postCta="sign in."
                            switchNetwork={switchNetwork}
                        />
                    </Box>
                )}

                <Stack centerContent gap horizontal>
                    <Box horizontal color="gray2" alignItems="center" gap="xs">
                        <Icon type="help" />
                        <Text size="sm" textAlign="center">
                            <a
                                href="https://www.towns.com/introduction/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                What is Towns?
                            </a>
                        </Text>
                    </Box>

                    <Box horizontal color="gray2" alignItems="center" gap="xs">
                        <Icon type="manifesto" />
                        <Text size="sm" textAlign="center">
                            <a
                                href="https://www.towns.com/vision/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Read the vision
                            </a>
                        </Text>
                    </Box>
                </Stack>
            </Stack>
        </Stack>
    )
}

export default InviteLinkLanding
