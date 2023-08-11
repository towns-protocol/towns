import React, { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { Box, Button, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { FadeIn } from '@components/Transitions'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { PATHS } from 'routes'
import { LoginComponent } from '@components/Login/LoginComponent'
import { useDevice } from 'hooks/useDevice'
import { TownsTokenConfig } from '../components/TownsToken/TownsTokenConfig'

const InviteLinkLanding = () => {
    const spaceId = useSpaceIdFromPathname()
    const [searchParams] = useSearchParams()
    const isInvite = searchParams.get('invite') != undefined
    const { data, isLoading } = useContractSpaceInfo(spaceId)
    const setTitle = useSetDocTitle()
    const { data: roomTopic } = useGetSpaceTopic(spaceId)
    const url = new URL(window.location.href)
    const { address: currentWallet } = useAccount()
    const invalidWallet = url.searchParams.get('invalidWallet')
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    // relevant only if a user has tried to join the town already, but we're denied b/c they don't have permission, and they then selected "switch wallet"
    // which navigates them back to this view, but with the invalidWallet param set. We need this b/c metamask UI is not very intuitive
    // and it's not clear that a user still needs to switch their account after connecting a new wallet
    const currentWalletIsInvalidForTown =
        currentWallet && invalidWallet && currentWallet === invalidWallet

    const { walletStatus, connect, loginStatus, login, register } = useAuth()

    const { status } = useSignupButton({
        walletStatus,
        loginStatus,
        connect,
        register,
        login,
    })

    useEffect(() => {
        if (!data) {
            return
        }
        setTitle(`Join ${data.name}`)
    }, [data, setTitle])

    const spaceIconSize = TownsTokenConfig.sizes['lg'].containerSize

    if (!isInvite) {
        return <Navigate replace to={`/${PATHS.LOGIN}`} />
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
            {data ? (
                <>
                    <InteractiveSpaceIcon
                        spaceId={data.networkId}
                        address={data.address}
                        spaceName={data.name}
                        size={isTouch ? 'sm' : 'lg'}
                    />
                    <Stack gap data-testid="town-info">
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
                                centerContent
                                style={{
                                    width: spaceIconSize,
                                    height: spaceIconSize,
                                }}
                            >
                                <ButtonSpinner />
                            </Box>
                            <Stack gap>
                                <Text>&nbsp;</Text>
                                <Heading level={2}> &nbsp;</Heading>
                            </Stack>
                        </>
                    ) : (
                        <Box centerContent gap="lg" data-testid="not-found">
                            <Icon color="error" type="alert" size="square_xl" />
                            <Text size="lg">Town not found</Text>
                        </Box>
                    )}
                </>
            )}

            <Stack paddingTop="sm" gap="lg" alignItems="center">
                {status === SignupButtonStatus.Register && (
                    <Text color="gray2" size="sm" textAlign="center">
                        Looks like you&apos;re not registered yet. Register now to join.
                    </Text>
                )}

                {isLoading ? (
                    <Box height="x5" />
                ) : data ? (
                    <FadeIn>
                        <LoginComponent />
                    </FadeIn>
                ) : (
                    <Button onClick={() => navigate(`/${PATHS.LOGIN}`)}>Take me to login</Button>
                )}

                {currentWalletIsInvalidForTown && (
                    <Box color="negative" paddingTop="md">
                        <Text size="sm" textAlign="center">
                            {
                                "Your selected wallet doesn't have permissions for this town. Select a different wallet and try again."
                            }
                        </Text>
                    </Box>
                )}

                {!isLoading && (
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
                )}
            </Stack>
        </Stack>
    )
}

export default InviteLinkLanding
