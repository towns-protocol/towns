import React from 'react'
import { NavLink, Navigate, useLocation } from 'react-router-dom'
import { useProvider } from 'wagmi'
import { useSpaceDapp } from 'use-zion-client'
import { ethers } from 'ethers'
import { useQuery } from '@tanstack/react-query'
import { Box, Icon, Stack, Text } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'
import { env } from 'utils'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { useAuth } from 'hooks/useAuth'
import { SpaceIcon } from '@components/SpaceIcon'
import { LoginButton } from '@components/Login/LoginButton/LoginButton'

const useSpaceInfo = (spaceId: string) => {
    const chainId = env.IS_DEV ? 31337 : 5
    const provider = useProvider<ethers.providers.Web3Provider>({ chainId })
    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery(
        ['spaceDapp', spaceId],
        () => {
            return spaceDapp?.getSpaceInfo(spaceId)
        },
        {
            enabled: !!spaceDapp,
        },
    )
}

function getButtonLabel(status: SignupButtonStatus) {
    switch (status) {
        case SignupButtonStatus.Register:
            return 'Register'
        case SignupButtonStatus.Login:
            return 'Login to join'
        case SignupButtonStatus.ConnectRequired:
        case SignupButtonStatus.ConnectError:
            return 'Connect Wallet'
        default:
            return 'Waiting for approval'
    }
}

const InviteLinkLanding = () => {
    const { pathname } = useLocation()
    const spaceId = decodeURIComponent(pathname.split('/').pop() || '')
    const { invite } = useQueryParams('invite')
    const isInvite = invite != undefined
    const { data } = useSpaceInfo(spaceId)

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

    if (!isInvite) {
        return <Navigate replace to="/login" />
    }

    return (
        <Stack centerContent grow alignSelf="center" height="100%" maxWidth="420">
            {data ? (
                <Stack centerContent gap="md" paddingBottom="lg">
                    <SpaceIcon
                        spaceId={spaceId}
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
                    and understood, and agree to Zion&apos;s Terms & Privacy Policy
                </Text>
                <Stack flexDirection="row" gap="sm">
                    <NavLink to="/">
                        <Box flexDirection="row" color="gray2" alignItems="center" gap="sm">
                            <Icon type="help" />

                            <Text size="sm" textAlign="center">
                                What is Zion?
                            </Text>
                        </Box>
                    </NavLink>
                    <NavLink to="/">
                        <Box flexDirection="row" color="gray2" alignItems="center" gap="sm">
                            <Icon type="manifesto" />

                            <Text size="sm" textAlign="center">
                                Read the Manifesto
                            </Text>
                        </Box>
                    </NavLink>
                </Stack>
            </Stack>
        </Stack>
    )
}

export default InviteLinkLanding
