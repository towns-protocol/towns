import React from 'react'
import { Box, BoxProps, Paragraph, Stack, TextButton } from '@ui'
import { ContractInfoButtons } from './ContractInfoButtons'

type Props = {
    canEdit: boolean | undefined
    onEdit: () => void
    name: string | undefined
    owner: string | undefined
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
                <Stack gap="paragraph">
                    <Stack horizontal alignItems="center" width="100%">
                        <Paragraph strong truncate size="lg" color="default">
                            {name ?? ''}
                        </Paragraph>
                        <Box grow />
                        {canEdit && (
                            <TextButton data-testid="edit-button" onClick={onEdit}>
                                Edit
                            </TextButton>
                        )}
                    </Stack>
                    <ContractInfoButtons contractAddress={address} />
                </Stack>
            </MdGap>
            {!canEdit && !motto?.length ? null : (
                <MdGap data-testid="motto-section">
                    <Stack gap="paragraph">
                        <Stack horizontal alignItems="center" width="100%">
                            <Paragraph strong color="default">
                                Town Motto
                            </Paragraph>{' '}
                            <Box grow />
                            {canEdit && (
                                <TextButton data-testid="edit-button" onClick={onEdit}>
                                    Edit
                                </TextButton>
                            )}
                        </Stack>
                        <Paragraph truncate size="md" color="gray2">
                            {motto}
                        </Paragraph>
                    </Stack>
                </MdGap>
            )}
            {!canEdit && about.length === 0 ? null : (
                <MdGap data-testid="about-section">
                    <Stack gap="paragraph">
                        <Stack horizontal alignItems="center" width="100%">
                            <Paragraph strong color="default">
                                About
                            </Paragraph>{' '}
                            <Box grow />
                            {canEdit && (
                                <TextButton data-testid="edit-button" onClick={onEdit}>
                                    Edit
                                </TextButton>
                            )}
                        </Stack>
                        <Paragraph color="gray2">{about}</Paragraph>
                    </Stack>
                </MdGap>
            )}
        </>
    )
}
