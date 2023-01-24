import React, { useCallback, useState } from 'react'
import { Box, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { SpaceIcon } from '@components/SpaceIcon'
import { ChainSpaceData } from 'hooks/useContractAndServerSpaceData'

type ModalProps = {
    onHide: () => void
    chainSpace: ChainSpaceData
}

const SpaceJoinModal = (props: ModalProps) => {
    const data = props.chainSpace
    if (!data) {
        return null
    }
    return (
        <ModalContainer onHide={props.onHide}>
            <Box centerContent>
                <Stack centerContent gap="md" paddingBottom="lg">
                    <SpaceIcon
                        spaceId={data.networkId}
                        width="250"
                        height="250"
                        firstLetterOfSpaceName={data.name[0]}
                        letterFontSize="display"
                    />
                    <Text>You&apos;re invited to join</Text>
                    <h2>{data?.name}</h2>
                </Stack>
            </Box>
        </ModalContainer>
    )
}

type Props = {
    chainSpace: ChainSpaceData
}

export const SpaceJoin = (props: Props) => {
    const [modal, setModal] = useState(true)

    const onHide = useCallback(() => {
        setModal(false)
    }, [])

    return (
        <Box centerContent absoluteFill data-testid="space-join">
            {modal && <SpaceJoinModal chainSpace={props.chainSpace} onHide={onHide} />}
        </Box>
    )
}
