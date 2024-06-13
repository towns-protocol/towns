import React from 'react'
import { Box, Paragraph, Stack, TextButton } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    canEdit: boolean | undefined
    onEdit: () => void
    name: string | undefined
    address: string
}

export function EditSpaceName(props: Props) {
    const { canEdit, onEdit, name, address } = props
    return (
        <Stack gap>
            <Stack horizontal alignItems="center" width="100%">
                <Paragraph strong truncate size="lg" color="default">
                    {name ?? ''}
                </Paragraph>
                <Box grow />
                {canEdit && <TextButton onClick={onEdit}>Edit</TextButton>}
            </Stack>
            {address && <ClipboardCopy label={shortAddress(address)} clipboardContent={address} />}
        </Stack>
    )
}
