import debug from 'debug'
import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { isAddress } from 'viem'
import { Spinner } from '@components/Spinner'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { TownPageMemberList } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { Box, BoxProps, Button, Heading, Icon, IconProps, Text } from '@ui'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { BottomBarLayout } from '@components/Web3/MembershipNFT/BottomBar'
import { PageLogo } from '@components/Logo/Logo'
import { useAuth } from 'hooks/useAuth'
import { LoginComponent } from '@components/Login/LoginComponent'
import { useMeetsMembershipNftRequirements } from 'hooks/useTokensGatingMembership'
import { useJoinTown } from 'hooks/useJoinTown'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'

const log = debug('app:public-town')
log.enabled = true

export const PublicTownPage = () => {
    const { spaceSlug } = useParams()
    // TEMPORARY joining state until hook is built for minting
    const [isJoining, setIsJoining] = useState(false)

    const { data: spaceInfo, isLoading } = useContractSpaceInfo(spaceSlug)
    const { data: townBio } = useGetSpaceTopic(spaceSlug)
    const { isConnected, isAuthenticatedAndConnected } = useAuth()

    const { data: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useMeetsMembershipNftRequirements(spaceInfo?.networkId, isConnected)
    const { joinSpace } = useJoinTown(spaceInfo?.networkId)

    const onJoinClick = useCallback(async () => {
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [joinSpace])

    return spaceInfo ? (
        <>
            <FixedBackground networkId={spaceInfo.networkId} />
            <Box horizontal centerContent width="100%" padding="lg">
                <Box width="wide">
                    <Box position="absolute">
                        <PageLogo />
                    </Box>
                </Box>
            </Box>
            <TownPageLayout
                contentRight={<TownPageMemberList />}
                bottomContent={
                    <BottomBarLayout
                        buttonContent={
                            isAuthenticatedAndConnected ? (
                                isLoadingMeetsMembership ? (
                                    <MembershipStatusMessage
                                        spinner
                                        background="level3"
                                        message="Checking requirements"
                                    />
                                ) : meetsMembershipRequirements ? (
                                    <Button
                                        tone="cta1"
                                        width="100%"
                                        type="button"
                                        disabled={isJoining}
                                        onClick={onJoinClick}
                                    >
                                        {isJoining && <ButtonSpinner />}
                                        Join {spaceInfo.name}
                                    </Button>
                                ) : (
                                    <MembershipStatusMessage
                                        background="error"
                                        icon="alert"
                                        message={`You don't have the required digital assets to join this town.`}
                                    />
                                )
                            ) : (
                                // shows connect button
                                <LoginComponent isPublicPage />
                            )
                        }
                    />
                }
                networkId={spaceInfo.networkId}
                address={isAddress(spaceInfo.address) ? spaceInfo.address : undefined}
                name={spaceInfo.name}
                owner={isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined}
                bio={townBio}
            />
        </>
    ) : isLoading ? (
        <MessageBox>
            <Spinner />
            <Heading level={4}>Fetching town data</Heading>
        </MessageBox>
    ) : (
        <MessageBox color="error">
            <Icon type="alert" />
            <Heading level={4}>Town not found</Heading>
        </MessageBox>
    )
}

function MembershipStatusMessage({
    background = 'error',
    message,
    icon,
    spinner,
}: {
    background?: BoxProps['background']
    message: string
    icon?: IconProps['type']
    spinner?: boolean
}) {
    return (
        <Box
            horizontal
            centerContent
            gap
            rounded="sm"
            background={background}
            width="100%"
            maxWidth="300"
            height="x6"
            padding="lg"
        >
            {spinner && <ButtonSpinner />}
            {icon && <Icon type={icon} />}
            <Text>{message}</Text>
        </Box>
    )
}

const MessageBox = ({ children, ...boxProps }: BoxProps) => (
    <Box absoluteFill centerContent {...boxProps}>
        <Box gap centerContent textAlign="center">
            {children}
        </Box>
    </Box>
)

const FixedBackground = ({ networkId }: { networkId: string }) => {
    const { imageSrc } = useImageSource(networkId, ImageVariants.thumbnail600)
    return (
        <Box
            position="fixed"
            top="none"
            left="none"
            bottom="none"
            right="none"
            pointerEvents="none"
        >
            <BlurredBackground imageSrc={imageSrc ?? ''} blur={40} />
        </Box>
    )
}
