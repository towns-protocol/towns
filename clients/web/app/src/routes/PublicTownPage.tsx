import debug from 'debug'
import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { isAddress } from 'viem'
import { Spinner } from '@components/Spinner'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { TownPageMemberList } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { Box, BoxProps, Button, Heading, Icon } from '@ui'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { BottomBarLayout } from '@components/Web3/MembershipNFT/BottomBar'
import { PageLogo } from '@components/Logo/Logo'
import { TownAccessModal } from '@components/TownAccessModal/TownAccessModal'
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

    const [isModalShowing, setIsModalShowing] = React.useState(false)
    const onHideModal = useCallback(() => {
        setIsModalShowing(false)
    }, [])
    const { data: meetsMembershipRequirements } = useMeetsMembershipNftRequirements(
        spaceInfo?.networkId,
        isConnected,
    )
    const { joinSpace } = useJoinTown(spaceInfo?.networkId)

    const onJoinClick = useCallback(async () => {
        // login
        if (!isAuthenticatedAndConnected) {
            setIsModalShowing(true)
            return
        }
        // now can join
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [isAuthenticatedAndConnected, joinSpace])

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
                            isConnected ? (
                                meetsMembershipRequirements ? (
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
                                    <Box
                                        horizontal
                                        centerContent
                                        gap
                                        rounded="sm"
                                        background="error"
                                        width="100%"
                                        height="x6"
                                        padding="lg"
                                    >
                                        <Icon type="alert" />{' '}
                                        {`You don't have the required digital assets to join this town.`}
                                    </Box>
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
            {isModalShowing && <TownAccessModal spaceInfo={spaceInfo} onHide={onHideModal} />}
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
