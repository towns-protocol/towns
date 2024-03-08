import React from 'react'
import { useSpaceMembers } from 'use-towns-client'
import { MembersPage } from '@components/MembersPage/MembersPage'

export const SpaceMembers = () => {
    const { memberIds } = useSpaceMembers()
    return <MembersPage memberIds={memberIds} />
}
