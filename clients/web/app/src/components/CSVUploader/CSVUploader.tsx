import React, { useCallback, useState } from 'react'
import { Address } from 'use-towns-client'
import { DropzoneOptions, useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { getAddress, isAddress } from 'ethers/lib/utils'
import { Box, Button, Card, FancyButton, IconButton, Paragraph, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useDevice } from 'hooks/useDevice'
import { CSVUploaderStyles } from './CSVUploader.css'

interface Props {
    handleCSVAddresses: (addresses: Address[]) => void
}

const csvMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/csv',
    'text/x-csv',
    'application/x-csv',
    'text/comma-separated-values',
    'text/x-comma-separated-values',
]

export const CSVUploader = ({ handleCSVAddresses }: Props) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploadedCount, setUploadedCount] = useState(0)
    const [validAddresses, setValidAddresses] = useState<Address[]>([])
    const [invalidAddresses, setInvalidAddresses] = useState<string[]>([])
    const [duplicateCount, setDuplicateCount] = useState(0)
    const { isTouch } = useDevice()

    const onDrop = useCallback<Required<DropzoneOptions>['onDrop']>((acceptedFiles) => {
        const csv = acceptedFiles.find(
            (f) => csvMimeTypes.includes(f.type) || f.name?.endsWith('.csv'),
        )
        if (!csv) {
            console.error('No valid CSV file found.')
            return
        }

        Papa.parse(csv, {
            complete: (results) => {
                const addresses = results.data
                    .flatMap((row: unknown) => {
                        if (Array.isArray(row)) {
                            return row.map((value: unknown) =>
                                typeof value === 'string' ? value.trim() : '',
                            )
                        }
                        return []
                    })
                    .filter((address) => address !== '')

                setUploadedCount(addresses.length)

                const validSet = new Set<Address>()
                const invalidSet: string[] = []
                let duplicateCount = 0

                addresses.forEach((address) => {
                    const normalizedAddress = address.toLowerCase().startsWith('0x')
                        ? address
                        : `0x${address}`
                    if (isAddress(normalizedAddress)) {
                        const checksumAddress = getAddress(normalizedAddress)
                        if (validSet.has(checksumAddress as Address)) {
                            duplicateCount++
                        } else {
                            validSet.add(checksumAddress as Address)
                        }
                    } else {
                        invalidSet.push(address)
                    }
                })

                setValidAddresses(Array.from(validSet))
                setInvalidAddresses(invalidSet)
                setDuplicateCount(duplicateCount)
            },
        })
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

    const resetCSVUploader = () => {
        setUploadedCount(0)
        setValidAddresses([])
        setInvalidAddresses([])
        setDuplicateCount(0)
    }

    const handleAddAddresses = () => {
        handleCSVAddresses(validAddresses)
        setIsModalOpen(false)
        resetCSVUploader()
        setDuplicateCount(0)
    }

    return (
        <>
            <IconButton
                icon="download"
                tooltip="Upload CSV"
                background="level2"
                padding="md"
                rounded="sm"
                style={{ transform: 'rotate(180deg)' }}
                data-testid="upload-csv-button"
                onClick={() => setIsModalOpen(true)}
            />
            {isModalOpen && (
                <ModalContainer onHide={() => setIsModalOpen(false)}>
                    <Stack gap="md">
                        <Box
                            display="flex"
                            flexDirection="row"
                            justifyContent="spaceBetween"
                            alignItems="center"
                        >
                            <Text fontWeight="strong">
                                {uploadedCount > 0 ? 'Confirm Addresses' : 'Upload CSV'}
                            </Text>
                            {!isTouch && (
                                <IconButton icon="close" onClick={() => setIsModalOpen(false)} />
                            )}
                        </Box>
                        {uploadedCount > 0 ? (
                            <Stack gap padding="sm">
                                <Text>
                                    - We found {validAddresses.length} valid address
                                    {validAddresses.length > 1 ? 'es' : ''}.
                                </Text>
                                {duplicateCount ? (
                                    <Text>
                                        - We found {duplicateCount} duplicate address
                                        {duplicateCount > 1 ? 'es' : ''}.
                                    </Text>
                                ) : null}
                                {invalidAddresses.length > 0 && (
                                    <Box padding="none" gap="sm">
                                        <Text>
                                            - We found {invalidAddresses.length} invalid address
                                            {invalidAddresses.length > 1 ? 'es' : ''}:
                                        </Text>
                                        <Card padding="md" gap="sm" maxHeight="300" overflow="auto">
                                            {invalidAddresses.map((address) => (
                                                <Text key={address} color="error">
                                                    {address}
                                                </Text>
                                            ))}
                                        </Card>
                                        {duplicateCount || invalidAddresses.length > 0 ? (
                                            <Text size="sm">
                                                By clicking &quot;Confirm&quot;, we&apos;ll remove{' '}
                                                {invalidAddresses.length > 0 ? 'all invalid' : ''}
                                                {invalidAddresses.length > 0 && duplicateCount > 0
                                                    ? ' and '
                                                    : ''}
                                                {duplicateCount > 0 ? 'all duplicate' : ''}{' '}
                                                addresses.
                                            </Text>
                                        ) : null}
                                    </Box>
                                )}
                                {validAddresses.length > 0 ? (
                                    <FancyButton
                                        cta
                                        data-testid="confirm-button"
                                        onClick={handleAddAddresses}
                                    >
                                        {`Confirm with ${validAddresses.length} addresses`}
                                    </FancyButton>
                                ) : (
                                    <Button onClick={() => setValidAddresses([])}>
                                        Upload new CSV
                                    </Button>
                                )}
                            </Stack>
                        ) : (
                            <>
                                {/* @ts-expect-error - Some types are not correct */}
                                <Box
                                    {...getRootProps()}
                                    padding="lg"
                                    rounded="md"
                                    cursor="pointer"
                                    className={CSVUploaderStyles}
                                >
                                    <input {...getInputProps()} data-testid="csv-file-input" />
                                    <Paragraph>
                                        {isDragActive
                                            ? 'Drop the CSV file here'
                                            : 'Drag and drop a CSV file here, or click to select one'}
                                    </Paragraph>
                                </Box>
                            </>
                        )}
                    </Stack>
                </ModalContainer>
            )}
        </>
    )
}
