import { useAgentConnection } from '@river-build/react-sdk'
import { useState } from 'react'
import { cn } from '@/utils'
import { getStreamMetadataUrl } from '@/utils/stream-metadata'

const getAvatarUrl = (environmentId: string, userId: string) => {
    return `${getStreamMetadataUrl(environmentId)}/user/${userId}/image`
}

export const Avatar = ({ userId, className }: { userId: string; className?: string }) => {
    const { env: currentEnv } = useAgentConnection()
    const [avatar, setAvatar] = useState(getAvatarUrl(currentEnv ?? '', userId))

    return (
        <img
            src={avatar}
            alt={`Avatar of user with user id ${userId}`}
            className={cn('object-cover', className)}
            onError={() => setAvatar('/public/pp1.png')}
        />
    )
}
