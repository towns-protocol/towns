import { useNavigate } from 'react-router-dom'
import { Membership, RoomIdentifier } from 'use-zion-client'
import { CreateSpaceForm } from '../components/CreateSpaceForm'

export const SpacesNew = () => {
    const navigate = useNavigate()
    const onSpaceCreated = (spaceId: RoomIdentifier, membership: Membership) => {
        navigate('/spaces/' + spaceId.slug + '/')
    }
    return <CreateSpaceForm onClick={onSpaceCreated} />
}
