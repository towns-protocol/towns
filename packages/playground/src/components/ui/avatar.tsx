import { useAgentConnection } from '@towns-protocol/react-sdk'
import { useState } from 'react'
import { cn } from '@/utils'
import { getStreamMetadataUrl } from '@/utils/stream-metadata'

const getAvatarUrl = (environmentId: string, userId: string, size: string = 'thumbnail') => {
    return `${getStreamMetadataUrl(environmentId)}/user/${userId}/image?size=${size}`
}

export const Avatar = ({
    userId,
    className,
    size = 'thumbnail',
}: {
    userId: string
    className?: string
    size?: 'thumbnail' | 'small' | 'medium' | 'original'
}) => {
    const { env: currentEnv } = useAgentConnection()
    const [avatar, setAvatar] = useState(getAvatarUrl(currentEnv ?? '', userId, size))

    return (
        <img
            src={avatar}
            alt={`Avatar of user with user id ${userId}`}
            className={cn('aspect-square rounded-full object-cover', className)}
            onError={() => setAvatar('/pp1.png')}
        />
    )
}
