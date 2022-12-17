import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { useMatrixCredentials, useMyProfile } from 'use-zion-client'
import { ProfileSettingsCard } from '@components/Cards/ProfileSettingsCard'
import { FadeIn } from '@components/Transitions'
import { Avatar, Box, Paragraph, Stack } from '@ui'
import { CardOpener } from 'ui/components/Overlay/CardOpener'

type Props = {
    expanded?: boolean
}

export const ProfileCardButton = (props: Props) => {
    const { expanded: isExpanded } = props
    const { isAuthenticated, userId, username } = useMatrixCredentials()
    const myProfile = useMyProfile()

    return !isAuthenticated ? null : (
        <CardOpener
            tabIndex={0}
            placement="topRight"
            layoutId="topbar"
            render={
                <Box horizontal paddingY="md">
                    <ProfileSettingsCard
                        userId={userId ?? ''}
                        username={username ?? ''}
                        avatarUrl={myProfile?.avatarUrl}
                        displayName={myProfile?.displayName}
                    />
                </Box>
            }
        >
            {({ triggerProps }) => (
                <>
                    <MotionStack
                        horizontal
                        paddingTop="sm"
                        paddingBottom="md"
                        paddingX="md"
                        background="inherit"
                        as="button"
                        gap="sm"
                        alignItems="center"
                        layout="position"
                        overflow="hidden"
                        {...triggerProps}
                    >
                        <Avatar src={myProfile?.avatarUrl} size="avatar_x4" />
                        <AnimatePresence>
                            {isExpanded && (
                                <FadeIn>
                                    <Paragraph truncate strong color="gray1">
                                        {myProfile?.displayName}
                                    </Paragraph>
                                </FadeIn>
                            )}
                        </AnimatePresence>
                    </MotionStack>
                </>
            )}
        </CardOpener>
    )
}

const MotionStack = motion(Stack)
//Stack horizontal gap="sm" alignItems="center"
