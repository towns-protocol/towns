import React from 'react'
import { Box, BoxProps, Paragraph, Stack, TextButton } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    canEdit: boolean | undefined
    onEdit: () => void
    name: string | undefined
    address: string
    shortDescription: string | undefined
    longDescription: string | undefined
}

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box padding="md" gap="md" {...boxProps} background="level2" rounded="sm">
        {children}
    </Box>
)

export function EditTownInfo(props: Props) {
    const { canEdit, onEdit, name, address, shortDescription, longDescription } = props
    const motto = shortDescription ? shortDescription : canEdit ? 'Click "edit" to add a motto' : ''
    const about = longDescription
        ? longDescription
        : canEdit
        ? 'Click "edit" to add a description'
        : ''

    return (
        <>
            <MdGap>
                <Stack gap>
                    <Stack horizontal alignItems="center" width="100%">
                        <Paragraph strong truncate size="lg" color="default">
                            {name ?? ''}
                        </Paragraph>
                        <Box grow />
                        {canEdit && <TextButton onClick={onEdit}>Edit</TextButton>}
                    </Stack>
                    {address && (
                        <ClipboardCopy label={shortAddress(address)} clipboardContent={address} />
                    )}
                </Stack>
            </MdGap>
            <MdGap data-testId="motto-section">
                <Stack gap>
                    <Stack horizontal alignItems="center" width="100%">
                        <Paragraph strong color="default">
                            Town Motto
                        </Paragraph>{' '}
                        <Box grow />
                        {canEdit && <TextButton onClick={onEdit}>Edit</TextButton>}
                    </Stack>
                    <Paragraph truncate size="md" color="gray2">
                        {motto}
                    </Paragraph>
                </Stack>
            </MdGap>
            <MdGap data-testId="about-section">
                <Stack gap>
                    <Stack horizontal alignItems="center" width="100%">
                        <Paragraph strong color="default">
                            About
                        </Paragraph>{' '}
                        <Box grow />
                        {canEdit && <TextButton onClick={onEdit}>Edit</TextButton>}
                    </Stack>
                    <Paragraph color="gray2">{about}</Paragraph>
                </Stack>
            </MdGap>
        </>
    )
}
