import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, Heading, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { checkAnyoneCanJoin, useTokensGatingMembership } from 'hooks/useTokensGatingMembership'
import { AvatarTextHorizontal } from 'ui/components/Avatar/AvatarTextHorizontal'
import { FadeInBox } from '@components/Transitions'
import { useReadableMembershipInfo } from './useReadableMembershipInfo'

type TownPageLayoutProps = {
    activityContent?: React.ReactNode
    bottomContent?: React.ReactNode
    networkId: string
    address?: `0x${string}`
    name?: string
    owner?: `0x${string}`
    bio?: string
}

export const TownPageLayout = (props: TownPageLayoutProps) => {
    const { address, bio, name, networkId, owner } = props

    const { isTouch } = useDevice()

    const { data: membershipInfo } = useReadableMembershipInfo(networkId)

    const { data: tokensGatingMembership, isLoading: isTokensGatingMembershipLoading } =
        useTokensGatingMembership(networkId)

    const anyoneCanJoin = checkAnyoneCanJoin(tokensGatingMembership)

    const { imageSrc } = useImageSource(networkId, ImageVariants.thumbnail600)

    return (
        <>
            <Stack
                grow
                horizontal
                alignItems="center"
                justifyContent="center"
                paddingX="lg"
                overflowY="scroll"
            >
                <Stack
                    grow
                    height="100%"
                    minHeight="600"
                    paddingY="x8"
                    gap="x4"
                    direction={{ mobile: 'columnReverse', default: 'row' }}
                    position="relative"
                    maxWidth="1200"
                    pointerEvents="all"
                >
                    {/* left column */}
                    <Stack grow>
                        <Stack gap="x8">
                            {/* header */}

                            <Stack gap="lg">
                                <Heading level={1}>{name}</Heading>
                                <Box>
                                    {owner && (
                                        <AvatarTextHorizontal
                                            address={owner}
                                            prepend={<Text>By </Text>}
                                        />
                                    )}
                                </Box>
                            </Stack>

                            <Stack gap="lg">
                                {/* requirements */}
                                <Box
                                    gap="lg"
                                    direction={{ default: 'row', mobile: 'column' }}
                                    alignItems="start"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {/* requirements */}
                                        {isTokensGatingMembershipLoading ? (
                                            <FadeInBox
                                                horizontal
                                                centerContent
                                                gap="sm"
                                                key="requirements-loading"
                                            >
                                                <Text>loading</Text>
                                            </FadeInBox>
                                        ) : anyoneCanJoin ? (
                                            <FadeInBox
                                                horizontal
                                                centerContent
                                                gap="sm"
                                                key="requirements-anoyone"
                                            >
                                                <Text>For</Text>
                                                <Text strong display="inline">
                                                    Anyone
                                                </Text>
                                            </FadeInBox>
                                        ) : (
                                            <FadeInBox
                                                horizontal
                                                centerContent
                                                gap="sm"
                                                key="requirements-token"
                                            >
                                                <Text>You will Need</Text>
                                                <Box display="inline-flex" gap="sm">
                                                    {tokensGatingMembership.tokens.map((token) => (
                                                        <FetchedTokenAvatar
                                                            noLabel
                                                            key={token.contractAddress as string}
                                                            address={
                                                                token.contractAddress as string
                                                            }
                                                            tokenIds={token.tokenIds as number[]}
                                                            size="avatar_x4"
                                                            labelProps={{
                                                                size: 'md',
                                                            }}
                                                            layoutProps={{
                                                                horizontal: true,
                                                                maxWidth: 'auto',
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            </FadeInBox>
                                        )}
                                    </AnimatePresence>

                                    {/* dot */}
                                    <Box
                                        rounded="full"
                                        display={{ default: 'block', mobile: 'none' }}
                                        alignSelf="center"
                                        width="x1"
                                        height="x1"
                                        background="inverted"
                                    />

                                    {/* cost */}
                                    <Box horizontal centerContent gap="md">
                                        <Text>Cost</Text>
                                        <Text strong display="inline">
                                            {membershipInfo?.price}
                                        </Text>
                                    </Box>
                                </Box>
                                <Box gap="x8">
                                    {bio && (
                                        <Box>
                                            <Paragraph size="lg">{bio}</Paragraph>
                                        </Box>
                                    )}
                                    {props.activityContent}
                                </Box>
                            </Stack>
                        </Stack>
                    </Stack>
                    {/* right column */}
                    <Stack>
                        <Box
                            justifyContent={{ default: 'start', mobile: 'center' }}
                            insetTop={{ default: 'md', mobile: 'none' }}
                            insetRight={{ default: 'xs', mobile: 'none' }}
                        >
                            <InteractiveTownsToken
                                key={imageSrc}
                                size={isTouch ? 'lg' : 'xl'}
                                address={address}
                                imageSrc={imageSrc ?? undefined}
                                spaceName={name}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Stack>
            {props.bottomContent && (
                <Stack horizontal centerContent>
                    {props.bottomContent}
                </Stack>
            )}
            {/* 
            // Note: I don't think we will need a sheet - but I'm leaving this here to quickly add when we have real content
            <Sheet
                className={modalSheetClass}
                isOpen={isSheetOpen}
                detent="content-height"
                mountPoint={mountPoint}
                onClose={() => setIsSheetOpen(false)}
            >
                <Sheet.Container>
                    <Sheet.Header />
                    <Sheet.Content>
                        <Box padding>
                            <Heading level={3} textAlign="center">
                                About
                            </Heading>
                            <Paragraph>{bio}</Paragraph>
                        </Box>
                    </Sheet.Content>
                </Sheet.Container>
            </Sheet> */}
        </>
    )
}
