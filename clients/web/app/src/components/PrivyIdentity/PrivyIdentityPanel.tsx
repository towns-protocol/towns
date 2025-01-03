import React from 'react'
import { useLinkAccount, usePrivy } from '@privy-io/react-auth'
import { Box, Icon, IconProps, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Panel } from '@components/Panel/Panel'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { ReauthenticateButton } from 'privy/WalletReady'

type LinkedAccount = NonNullable<ReturnType<typeof usePrivy>['user']>['linkedAccounts'][number]

export function PrivyIdentityPanel() {
    const { user, ready: privyReady, authenticated } = usePrivy()
    const { linkEmail, linkPhone, linkGoogle, linkApple, linkTwitter, linkFarcaster } =
        useLinkAccount({
            onSuccess: () => {
                popupToast(({ toast }) => (
                    <StandardToast.Success toast={toast} message="Account linked successfully" />
                ))
            },
            onError: (error) => {
                popupToast(({ toast }) => {
                    if (error === 'exited_link_flow') {
                        return
                    }
                    return (
                        <StandardToast.Error
                            toast={toast}
                            message="Failed to link account"
                            subMessage={error.toString()}
                        />
                    )
                })
            },
        })
    const linkedAccounts = user?.linkedAccounts
    const linkTypes: {
        type: 'email' | 'phone' | 'google' | 'apple' | 'twitter' | 'farcaster'
        icon: IconProps['type']
        label: string
        action: () => void
    }[] = [
        {
            type: 'google',
            icon: 'google',
            label: 'Google',
            action: linkGoogle,
        },
        {
            type: 'twitter',
            icon: 'twitter',
            label: 'Twitter',
            action: linkTwitter,
        },
        {
            type: 'farcaster',
            icon: 'farcaster',
            label: 'Farcaster',
            action: linkFarcaster,
        },
        {
            type: 'apple',
            icon: 'apple',
            label: 'Apple',
            action: linkApple,
        },
        {
            type: 'email',
            icon: 'mail',
            label: 'Email',
            action: linkEmail,
        },
        {
            type: 'phone',
            icon: 'phone',
            label: 'Phone',
            action: linkPhone,
        },
    ]

    return (
        <Panel label="Linked Accounts">
            <Stack grow gap="lg" position="relative" overflow="auto">
                {!privyReady ? (
                    <ButtonSpinner />
                ) : !authenticated ? (
                    <Stack gap="sm">
                        <Stack gap="sm" background="level2" padding="md" rounded="sm">
                            <Text>Reauthenticate with Privy to view your linked accounts.</Text>
                        </Stack>
                        <ReauthenticateButton message="" />
                    </Stack>
                ) : (
                    <>
                        <Stack gap>
                            <Text strong>Linked accounts</Text>
                            {linkedAccounts ? (
                                linkedAccounts.map((account) => (
                                    <LinkedAccount
                                        key={account.firstVerifiedAt?.toString()}
                                        account={account}
                                    />
                                ))
                            ) : (
                                <Stack centerContent padding>
                                    <ButtonSpinner />
                                </Stack>
                            )}
                        </Stack>
                        <Text strong>Link another account</Text>
                        <Stack gap="sm">
                            {linkTypes.map(({ type, icon, label, action }) => (
                                <PanelButton centerContent key={type} onClick={action}>
                                    <Icon type={icon} size="square_sm" />
                                    <Paragraph>{label}</Paragraph>
                                </PanelButton>
                            ))}
                        </Stack>
                    </>
                )}
            </Stack>
        </Panel>
    )
}

const LinkedAccount = ({ account }: { account: LinkedAccount }) => {
    if (account.type === 'email') {
        return (
            <LinkedAccountDisplay>
                <Icon type="mail" size="square_sm" />
                <Text>Email {account.address}</Text>
            </LinkedAccountDisplay>
        )
    }
    if (account.type === 'phone') {
        return (
            <LinkedAccountDisplay>
                <Icon type="phone" size="square_sm" />
                <Text>Phone {account.number}</Text>
            </LinkedAccountDisplay>
        )
    }
    if (account.type === 'google_oauth') {
        return (
            <LinkedAccountDisplay>
                <Icon type="google" size="square_sm" />
                <Text>Google {account.email}</Text>
            </LinkedAccountDisplay>
        )
    }
    if (account.type === 'apple_oauth') {
        return (
            <LinkedAccountDisplay>
                <Icon type="apple" size="square_sm" />
                <Text>Apple {account.email}</Text>
            </LinkedAccountDisplay>
        )
    }

    return null
}

const LinkedAccountDisplay = ({ children }: { children: React.ReactNode }) => {
    return (
        <Box horizontal gap alignItems="center" background="level2" padding="md" borderRadius="sm">
            {children}
        </Box>
    )
}
