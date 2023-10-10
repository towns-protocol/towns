import React, { useMemo } from 'react'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { TownPageMemberList } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { Box, Heading, Paragraph, Stack, Text } from '@ui'
import { AvatarTextHorizontal } from 'ui/components/Avatar/AvatarTextHorizontal'

type TownPageLayoutProps = {
    contentRight?: React.ReactNode
    bottomContent?: React.ReactNode
    networkId: string
    address?: `0x${string}`
    name?: string
    owner?: `0x${string}`
    bio?: string
}

export const TownPageLayout = (props: TownPageLayoutProps) => {
    const { address, name, bio } = props

    const { imageSrc } = useImageSource(props.networkId, ImageVariants.thumbnail600)

    const transactionDetails = useMemo(
        () => ({
            townAddress: address,
            isTransacting: false,
            imageSrc,
        }),
        [imageSrc, address],
    )

    return (
        <>
            <Stack centerContent grow paddingX="lg" width="100%" overflowY="scroll">
                <Box
                    display="block"
                    width={{ mobile: '100%', default: undefined }}
                    maxHeight="100%"
                    paddingY="x8"
                >
                    <Stack
                        direction={{ mobile: 'column', default: 'row' }}
                        position="relative"
                        width="100%"
                        maxWidth="1200"
                        pointerEvents="all"
                    >
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
                        {/* left column */}
                        <Stack grow>
                            <Stack gap="x4">
                                <Box centerContent>
                                    <InteractiveTownsToken
                                        key={imageSrc}
                                        size="xl"
                                        address={transactionDetails.townAddress}
                                        imageSrc={imageSrc ?? undefined}
                                        spaceName={name}
                                    />
                                </Box>

                                <Heading level={1}>{name}</Heading>

                                <Box fontSize="lg" gap="lg">
                                    {props.owner && (
                                        <AvatarTextHorizontal
                                            address={props.owner}
                                            prepend={<Text size="lg">By </Text>}
                                        />
                                    )}
                                    <Box
                                        horizontal
                                        justifyContent="spaceBetween"
                                        alignContent="center"
                                    >
                                        <Text size="lg">For Anyone Placeholder</Text>
                                    </Box>
                                    <Box>
                                        <Paragraph size="lg">{bio}</Paragraph>
                                    </Box>
                                </Box>
                            </Stack>
                        </Stack>
                        {/* right column */}
                        <Stack>
                            <TownPageMemberList />
                        </Stack>
                    </Stack>
                </Box>
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
