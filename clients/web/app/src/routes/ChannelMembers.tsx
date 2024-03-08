import React from 'react'
import { useChannelMembers } from 'use-towns-client'
import { MembersPage } from '@components/MembersPage/MembersPage'

export const ChannelMembers = () => {
    const { memberIds } = useChannelMembers()
    return <MembersPage memberIds={memberIds} />
}
