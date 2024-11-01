import React from 'react'
import { useLinkAccount, usePrivy } from '@privy-io/react-auth'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { Box, BoxProps, Icon, IconProps, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Panel } from '@components/Panel/Panel'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'

export const PrivyIdentityPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <_PrivyIdentityPanel />
        </PrivyWrapper>
    )
})

type LinkedAccount = NonNullable<ReturnType<typeof usePrivy>['user']>['linkedAccounts'][number]

function _PrivyIdentityPanel() {
    const { user } = usePrivy()
    const { linkEmail, linkPhone, linkGoogle, linkApple } = useLinkAccount({
        onSuccess: () => {
            popupToast(({ toast }) => (
                <StandardToast.Success toast={toast} message="Account linked successfully" />
            ))
        },
        onError: (error) => {
            popupToast(({ toast }) => (
                <StandardToast.Error
                    toast={toast}
                    message="Failed to link account"
                    subMessage={error.toString()}
                />
            ))
        },
    })
    const linkedAccounts = user?.linkedAccounts
    const linkTypes: {
        type: 'email' | 'phone' | 'google' | 'apple'
        icon: IconProps['type']
        label: string
        action: () => void
    }[] = [
        {
            type: 'email',
            icon: 'inbox',
            label: 'Email',
            action: linkEmail,
        },
        {
            type: 'phone',
            icon: 'shake',
            label: 'Phone',
            action: linkPhone,
        },
        {
            type: 'google',
            icon: 'google',
            label: 'Google',
            action: linkGoogle,
        },
        {
            type: 'apple',
            icon: 'apple',
            label: 'Apple',
            action: linkApple,
        },
    ]

    return (
        <Panel label="Identity">
            <Stack grow gap="lg" position="relative" overflow="auto">
                <Stack gap>
                    <Text size="lg">Linked accounts:</Text>
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
                <Text size="lg">Link additional accounts:</Text>
                <Stack gap="sm">
                    {linkTypes.map(({ type, icon, label, action }) => (
                        <PanelButton centerContent key={type} onClick={action}>
                            <Icon type={icon} size="square_sm" />
                            <Paragraph>{label}</Paragraph>
                        </PanelButton>
                    ))}
                </Stack>
            </Stack>
        </Panel>
    )
}

const LinkedAccount = ({ account }: { account: LinkedAccount }) => {
    if (account.type === 'email') {
        return (
            <LinkedAccountDisplay>
                <Icon type="inbox" size="square_sm" />
                <Text>Email {account.address}</Text>
            </LinkedAccountDisplay>
        )
    }
    if (account.type === 'phone') {
        return (
            <LinkedAccountDisplay>
                <Icon type="shake" size="square_sm" />
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
        <Box horizontal gap alignItems="center" background="level3" padding="md" borderRadius="sm">
            {children}
        </Box>
    )
}

export function FullPanelOverlay({
    text,
    background,
    withSpinner = true,
    opacity = '0.9',
}: {
    text?: string
    background?: BoxProps['background']
    withSpinner?: boolean
    opacity?: BoxProps['opacity']
}) {
    return (
        <Stack absoluteFill centerContent zIndex="above">
            <Stack
                opacity={opacity}
                position="absolute"
                background={background}
                style={!background ? { background: 'var(--background)' } : undefined}
                width="100%"
                height="100%"
            />
            <Stack gap="lg" position="relative">
                <Text>{text}</Text>
                {withSpinner && <ButtonSpinner />}
            </Stack>
        </Stack>
    )
}
