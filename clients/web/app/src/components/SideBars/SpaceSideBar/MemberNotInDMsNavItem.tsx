import React from 'react'
import { useUserLookup } from 'use-towns-client'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { Box } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { useCreateLink } from 'hooks/useCreateLink'
import { useMembersNotInDMs } from './hooks/useMembersNotInDMs'

type Props = ReturnType<typeof useMembersNotInDMs>['data'][number]

export function MemberNotInDMsNavItem(props: Props) {
    const { id } = props

    const user = useUserLookup(id)
    const hasUserName =
        user.username !== undefined && user.username !== null && user.username !== ''
    const { createLink } = useCreateLink()

    return (
        <ActionNavItem
            exact
            key={id}
            id={id}
            label={hasUserName ? user.username : id}
            icon={
                <Box width="x4" shrink={false}>
                    <Avatar userId={id} size="avatar_x4" />
                </Box>
            }
            link={createLink({ profileId: id })}
            minHeight="x5"
        />
    )
}
