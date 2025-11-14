import { useAgentConnection } from '@towns-protocol/react-sdk'
import { useState } from 'react'
import { townsEnv } from '@towns-protocol/sdk'
import { cn } from '@/utils'
import { useAppMetadata } from '@/hooks/useAppMetadata'
import { VITE_ENV_OPTIONS } from '@/utils/environment'

const getAvatarUrl = (environmentId: string, userId: string) => {
    return `${townsEnv(VITE_ENV_OPTIONS).getStreamMetadataUrl(environmentId)}/user/${userId}/image`
}

export const Avatar = ({
    userId,
    className,
    isBot,
}: {
    userId: string
    className?: string
    isBot?: boolean
}) => {
    if (isBot) {
        return <BotAvatar appClientId={userId} className={className} />
    }
    return <UserAvatar userId={userId} className={className} />
}

const UserAvatar = ({ userId, className }: { userId: string; className?: string }) => {
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

const BotAvatar = ({ appClientId, className }: { appClientId: string; className?: string }) => {
    const { data: metadata } = useAppMetadata(appClientId)

    return (
        <img
            src={metadata?.avatarUrl}
            alt={`Avatar of bot with app client id ${appClientId}`}
            className={cn('aspect-square rounded-full object-cover', className)}
        />
    )
}
