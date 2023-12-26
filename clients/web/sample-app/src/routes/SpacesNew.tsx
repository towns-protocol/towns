import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Membership } from 'use-zion-client'
import { CreateSpaceForm } from '../components/CreateSpaceForm'

export const SpacesNew = () => {
    const navigate = useNavigate()
    const onSpaceCreated = (spaceId: string, membership: Membership) => {
        navigate('/spaces/' + spaceId + '/')
    }
    return <CreateSpaceForm onClick={onSpaceCreated} />
}
