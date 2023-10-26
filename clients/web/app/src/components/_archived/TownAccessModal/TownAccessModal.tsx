import React, { useCallback } from 'react'
import { SpaceInfo } from 'use-zion-client'
import debug from 'debug'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useAuth } from 'hooks/useAuth'
import { Box, Button, Divider, Heading, Icon, Paragraph, Stack, Text, TextButton } from '@ui'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { useJoinTown } from 'hooks/useJoinTown'
import { useMeetsMembershipNftRequirements } from 'hooks/useTokensGatingMembership'

const log = debug('app:town-access-modal')
log.enabled = true

type Props = {
    onHide: () => void
    spaceInfo: SpaceInfo
}

export const TownAccessModal = (props: Props) => {
    const { imageSrc } = useImageSource(props.spaceInfo.networkId, ImageVariants.thumbnail600)

    return (
        <ModalContainer minWidth="700" padding="none" onHide={props.onHide}>
            <Box position="relative" minHeight="400" padding="x8" paddingBottom="x4" gap="lg">
                <TownBackground imageSrc={imageSrc} />
                <TownAccessModalContent {...props} />
                <Box centerContent>
                    <TextButton color="default" onClick={props.onHide}>
                        Cancel
                    </TextButton>
                </Box>
            </Box>
        </ModalContainer>
    )
}

const TownAccessModalContent = (props: Props) => {
    // const { loginStatus } = useAuth()
    // const { casablancaOnboardingState } = useZionContext()

    // log('loaded onboarding', casablancaOnboardingState)
    // log(loginStatus)

    // if (loginStatus !== loginFlowStatus.LoggedIn) {
    //     // this should move to button on the previous page
    //     return <TownAccessLoginStep />
    // }
    return <JoinStep {...props} />
}

// const TownAccessLoginStep = () => (
//     <Box centerContent grow>
//         <LoginComponent />
//     </Box>
// )

const JoinStep = (props: Props) => {
    const { spaceInfo } = props
    const { imageSrc } = useImageSource(spaceInfo.networkId, ImageVariants.thumbnail600)
    const { data: townBio } = useGetSpaceTopic(spaceInfo.networkId)
    const { isConnected } = useAuth()

    const onSuccess = useCallback(() => {
        // currently routing gets you to home once logged in
    }, [])

    const { switchWallet } = useSwitchWallet()

    const isEntitledCheck = useMeetsMembershipNftRequirements(spaceInfo.networkId, isConnected)

    const { joinSpace, notEntitled, maxLimitReached } = useJoinTown(spaceInfo.networkId, onSuccess)
    return (
        <>
            <Stack horizontal gap="x4">
                <InteractiveTownsToken
                    key={imageSrc}
                    size="lg"
                    address={spaceInfo.address}
                    imageSrc={imageSrc ?? undefined}
                    spaceName={spaceInfo.name}
                />
                <Box grow gap="x4">
                    <Heading level={1}>{spaceInfo.name}</Heading>
                    {townBio ? (
                        <Paragraph>{townBio}</Paragraph>
                    ) : (
                        <Paragraph color="gray2">No description provided</Paragraph>
                    )}
                </Box>
            </Stack>
            <Box insetX="xl">
                <Divider />
            </Box>
            <Box horizontal justifyContent="spaceBetween">
                {/* TODO */}
                <Text>You will need*</Text>
                <Text>Supply*</Text>
                <Text>Cost*</Text>
            </Box>
            <Box insetX="xl">
                <Divider />
            </Box>

            {maxLimitReached ? (
                <ErrorBanner>Max limit reached</ErrorBanner>
            ) : !isEntitledCheck || notEntitled ? (
                <ErrorBanner>
                    You don&apos;t have the required digital assets to join this town.{' '}
                    <a style={{ textDecoration: 'underline' }} onClick={switchWallet}>
                        Switch wallet
                    </a>
                </ErrorBanner>
            ) : (
                <Button tone="cta1" onClick={joinSpace}>
                    Join {spaceInfo.name}
                </Button>
            )}
        </>
    )
}

export const ErrorBanner = (props: { children: React.ReactNode }) => {
    return (
        <Box padding horizontal alignItems="center" gap="sm" background="error" rounded="xs">
            <Icon type="alert" /> <Paragraph>{props.children}</Paragraph>
        </Box>
    )
}

export const TownBackground = (props: { imageSrc: string }) => {
    return <BlurredBackground imageSrc={props.imageSrc ?? ''} blur={40} />
}

// taken from SpaceJoin.tsx
const useSwitchWallet = () => {
    const { logout } = useAuth()
    const switchWallet = useCallback(async () => {
        await logout()
        // triggers MM prompt to user to connect with different wallet, after connecting, they still have to change their account
        try {
            await window.ethereum?.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            })
        } catch (error) {
            console.error(error)
        }
    }, [logout])

    return { switchWallet }
}
