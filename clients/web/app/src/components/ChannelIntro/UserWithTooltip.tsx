import React, { useCallback } from 'react'
import { Address, LookupUserMap } from 'use-towns-client'
import { Box } from '@ui'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

type UserWithTooltipProps = {
    userId: string
    displayName?: string
    usersMap?: LookupUserMap
}

/**
 * Either provide a `displayName` or a `usersMap {LookupUserMap}` to get the user's display name,
 * otherwise `userId` will be shown
 *
 */
export const UserWithTooltip = (props: UserWithTooltipProps) => {
    const { userId, displayName, usersMap } = props
    const { openPanel } = usePanelActions()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address,
    })

    let userDisplayName = displayName
    if (!userDisplayName && usersMap) {
        userDisplayName = getPrettyDisplayName(
            usersMap[userId] ?? {
                abstractAccountAddress,
                displayName: '',
            },
        )
    } else if (!userDisplayName && !usersMap) {
        userDisplayName = userId
    }

    const onClick = useCallback(() => {
        openPanel('profile', { profileId: abstractAccountAddress })
    }, [abstractAccountAddress, openPanel])

    return (
        <Box
            as="span"
            color="default"
            display="inline"
            tooltip={<ProfileHoverCard userId={userId} />}
            cursor="pointer"
            onClick={onClick}
        >
            {userDisplayName}
        </Box>
    )
}
