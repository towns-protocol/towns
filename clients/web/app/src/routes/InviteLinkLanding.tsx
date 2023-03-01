import React, { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { LoginButton } from '@components/Login/LoginButton/LoginButton'
import { SpaceIcon } from '@components/SpaceIcon'
import { Box, Icon, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useSetDocTitle } from 'hooks/useDocTitle'

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
    const { data } = useContractSpaceInfo(spaceId)
    const setTitle = useSetDocTitle()

    const { walletStatus, connect, loginStatus, login, register } = useAuth()

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

    useEffect(() => {
        if (!data) {
            return
        }
        setTitle(`Join ${data.name}`)
    }, [data, setTitle])

    if (!isInvite) {
        return <Navigate replace to="/login" />
    }

    return (
        <Stack centerContent grow alignSelf="center" height="100%" maxWidth="420">
            {data ? (
                <Stack centerContent gap="md" paddingBottom="lg">
                    <SpaceIcon
                        spaceId={data.networkId}
                        width="250"
                        height="250"
                        firstLetterOfSpaceName={data.name[0]}
                        letterFontSize="display"
                    />
                    <Text>You&apos;re invited to join</Text>
                    <h2>{data?.name}</h2>
                </Stack>
            ) : (
                <Text>Space not found</Text>
            )}

            <Stack paddingTop="sm" gap="lg" alignItems="center">
                {status === SignupButtonStatus.Register && (
                    <Text color="gray2" size="sm" textAlign="center">
                        Looks like you&apos;re not registered yet. Register now to join.
                    </Text>
                )}

                <LoginButton
                    loading={isSpinning}
                    label={buttonLabel}
                    tone="cta1"
                    onClick={onButtonClick}
                />

                <Text color="gray2" size="sm" textAlign="center">
                    By clicking &quot;{buttonLabel}&quot; above, you acknowledge that you have read
                    and understood, and agree to Town&apos;s Terms & Privacy Policy
                </Text>
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
