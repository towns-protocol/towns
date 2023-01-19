import React from 'react'
import { Navigate } from 'react-router-dom'
import { Text } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'

const InviteLinkLanding = () => {
    const { invite } = useQueryParams('invite')
    const isInvite = invite != undefined

    if (!isInvite) {
        return <Navigate replace to="/login" />
    }

    return <Text>You were invited</Text>
}

export default InviteLinkLanding
