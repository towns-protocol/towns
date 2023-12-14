import React from 'react'
import { useChannelMembers } from 'use-zion-client'
import { MembersPage } from '@components/MembersPage/MembersPage'

export const ChannelMembers = () => {
    const { memberIds } = useChannelMembers()
    return <MembersPage memberIds={memberIds} />
}
