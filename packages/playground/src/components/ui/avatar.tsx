import { useAgentConnection } from '@towns-protocol/react-sdk'
import { useState } from 'react'
import { getStreamMetadataUrl } from '@towns-protocol/sdk'
import { cn } from '@/utils'

const getAvatarUrl = (environmentId: string, userId: string) => {
    return `${getStreamMetadataUrl(environmentId)}/user/${userId}/image`
}

export const Avatar = ({
    userId,
    className,
}: {
    userId: string
    className?: string
}) => {
    const { env: currentEnv } = useAgentConnection()
    const [avatar, setAvatar] = useState(getAvatarUrl(currentEnv ?? '', userId))

    return (
        <img
            src={avatar}
            alt={`Avatar of user with user id ${userId}`}
            className={cn('aspect-square rounded-full object-cover', className)}
            onError={() => setAvatar('/pp1.png')}
        />
    )
}
