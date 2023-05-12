import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { createUserIdFromString, useMatrixCredentials, useMyProfile } from 'use-zion-client'
import { ProfileSettingsCard } from '@components/Cards/ProfileSettingsCard'
import { FadeIn } from '@components/Transitions'
import { Avatar, Paragraph, Stack } from '@ui'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type Props = {
    expanded?: boolean
}

export const ProfileCardButton = (props: Props) => {
    const { expanded: isExpanded } = props
    const { isAuthenticated, userId, username } = useMatrixCredentials()
    const myProfile = useMyProfile()

    const userAddress = userId ? createUserIdFromString(userId)?.accountAddress : undefined

    return !isAuthenticated ? null : (
        <CardOpener
            tabIndex={0}
            placement="horizontal"
            layoutId="topbar"
            render={
                <ProfileSettingsCard
                    userId={userId ?? ''}
                    username={username ?? ''}
                    avatarUrl={myProfile?.avatarUrl}
                    displayName={getPrettyDisplayName(myProfile).name}
                    userAddress={userAddress}
                />
            }
        >
            {({ triggerProps: { ref, ...triggerProps } }) => (
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
                        <Avatar size="avatar_x4" ref={ref} userId={userId} />
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
