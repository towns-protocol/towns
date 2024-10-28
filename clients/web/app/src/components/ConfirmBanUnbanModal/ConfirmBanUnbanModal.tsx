import React, { useMemo } from 'react'
import { useSpaceData, useUserLookupContext } from 'use-towns-client'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'

export const ConfirmBanUnbanModal = (props: {
    onConfirm: (getSigner: GetSigner) => void
    onCancel: () => void
    ban: boolean
    userId: string
}) => {
    const { onConfirm, onCancel, userId, ban } = props
    const { lookupUser } = useUserLookupContext()
    const spaceData = useSpaceData()

    const globalUser = lookupUser(userId)

    const title = useMemo(() => {
        if (!globalUser || !spaceData) {
            return ban ? 'Confirm ban' : 'Confirm unban'
        }
        const name = getPrettyDisplayName(globalUser)
        return ban ? `Ban ${name} from ${spaceData.name}?` : `Unban ${name} from ${spaceData.name}?`
    }, [globalUser, ban, spaceData])

    const message = ban
        ? 'Their membership NFT will be banned and they will lose access to the town until they are unbanned.'
        : 'They will regain access to the town and their membership NFT will be unbanned.'

    return (
        <ModalContainer minWidth="auto" onHide={onCancel}>
            <Stack padding="sm" gap="lg" alignItems="start" maxWidth="350">
                <Text fontWeight="strong">{title}</Text>
                <Text>{message}</Text>
                <Stack horizontal gap width="100%">
                    <Box grow />
                    <Button tone="level2" onClick={onCancel}>
                        Cancel
                    </Button>
                    <WalletReady>
                        {({ getSigner }) => (
                            <Button tone="negative" onClick={() => onConfirm(getSigner)}>
                                Confirm
                            </Button>
                        )}
                    </WalletReady>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
