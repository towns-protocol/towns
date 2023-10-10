import debug from 'debug'
import React, { useCallback } from 'react'
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
import { SpaceJoin } from '@components/Web3/SpaceJoin'

const log = debug('app:public-town')
log.enabled = true

export const PublicTownPage = () => {
    const { spaceSlug } = useParams()

    const { data: spaceInfo, isLoading } = useContractSpaceInfo(spaceSlug)
    const { data: townBio } = useGetSpaceTopic(spaceSlug)

    const [isModalShowing, setIsModalShowing] = React.useState(false)
    const onCancelJoin = useCallback(() => {
        setIsModalShowing(false)
    }, [])
    const onJoinClick = useCallback(() => {
        setIsModalShowing(true)
    }, [])

    return spaceInfo ? (
        <>
            <Box horizontal centerContent width="100%" padding="lg">
                <Box width="1200">
                    <PageLogo />
                </Box>
            </Box>
            <TownPageLayout
                contentRight={<TownPageMemberList />}
                bottomContent={
                    <BottomBarLayout
                        buttonContent={
                            <Button tone="cta1" width="100%" type="button" onClick={onJoinClick}>
                                Join Town
                            </Button>
                        }
                    />
                }
                networkId={spaceInfo.networkId}
                address={isAddress(spaceInfo.address) ? spaceInfo.address : undefined}
                name={spaceInfo.name}
                owner={isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined}
                bio={townBio}
            />
            {isModalShowing && (
                <SpaceJoin
                    joinData={{
                        name: spaceInfo.name,
                        networkId: spaceInfo.networkId,
                        spaceAddress: spaceInfo.address,
                    }}
                    onCancel={onCancelJoin}
                />
            )}
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
