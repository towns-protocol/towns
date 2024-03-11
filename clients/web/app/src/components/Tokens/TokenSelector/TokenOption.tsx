import React, { useCallback, useRef, useState } from 'react'
import { Box, IconButton, Paragraph, Text } from '@ui'
import { supportedNftNetworks } from '@components/Web3/utils'
import { shortAddress } from 'ui/utils/utils'
import { Field } from 'ui/components/_internal/Field'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { TokenDataWithChainId, TokenType } from '../types'
import { tokenIdSchema } from './tokenSchemas'
import { TokenImage } from './TokenImage'
import { TokenSelectorStyles } from './TokenSelector.css'

export function TokenOption({
    option,
    onAddItem,
    selected,
}: {
    option: TokenDataWithChainId
    onAddItem: (option: TokenDataWithChainId) => void
    selected: boolean
}) {
    const isERC1155 = option.data.type === TokenType.ERC1155

    const [tokenIdErrorMessage, setTokenIdErrorMessage] = useState<string | undefined>()

    const [textInputValue, setTextInputValue] = useState<string>('')

    const onTextInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        const result = tokenIdSchema.safeParse({
            tokenId: Number(value?.length ? value : undefined),
        })
        if (!result.success) {
            if (value === '') {
                setTextInputValue('')
            }
            setTokenIdErrorMessage(result.error.flatten().fieldErrors?.tokenId?.[0])
            return
        } else {
            setTokenIdErrorMessage(undefined)
        }
        setTextInputValue(value)
    }, [])

    const addTokenId = useCallback(() => {
        if (textInputValue && option.data?.address) {
            throw new Error('Not implemented yet.')
        }
    }, [option.data?.address, textInputValue])

    const onTextInputKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                addTokenId()
            }
        },
        [addTokenId],
    )

    const textInputRef = useRef<HTMLInputElement>(null)

    const onAddTokenClick = useCallback(
        (e: React.MouseEvent<HTMLInputElement>) => {
            e.stopPropagation()
            addTokenId()
        },
        [addTokenId],
    )

    return (
        <Box gap="sm">
            <Text color="gray2">
                {
                    supportedNftNetworks.find((network) => network.vChain.id === option.chainId)
                        ?.vChain.name
                }
            </Text>
            <Box
                horizontal
                alignItems="center"
                gap="sm"
                rounded="xs"
                padding="sm"
                cursor={!isERC1155 ? 'pointer' : 'default'}
                data-testid={`token-selector-option-${option.data?.address}`}
                as={!isERC1155 ? 'button' : 'div'}
                type={!isERC1155 ? 'button' : undefined}
                color="default"
                className={!isERC1155 ? TokenSelectorStyles : undefined}
                onClick={() => {
                    if (!isERC1155) {
                        onAddItem(option)
                    }
                }}
            >
                {option.data.address && (
                    <>
                        <TokenImage imgSrc={option.data.imgSrc} width="x4" />
                        <Box
                            alignItems="start"
                            justifyContent="spaceBetween"
                            height="x4"
                            overflow="hidden"
                        >
                            <Paragraph truncate>
                                {option.data?.label ? option.data.label : 'Unknown NFT'}
                            </Paragraph>
                            {option.data?.address && (
                                <Box color="gray2" fontSize="sm" tooltip={option.data?.address}>
                                    {shortAddress(option.data?.address)}
                                </Box>
                            )}
                        </Box>
                    </>
                )}

                {isERC1155 && (
                    <Box
                        horizontal
                        alignItems="start"
                        justifySelf="end"
                        style={{
                            marginLeft: 'auto',
                        }}
                        height="x4"
                    >
                        {/* <Box width="x4" /> */}
                        <Box alignItems="start" paddingLeft="sm">
                            <Box horizontal centerContent gap>
                                <Box position="relative">
                                    <Field width="100" paddingX="none" tone="neutral">
                                        {(overlays, { className, ...inputProps }) => (
                                            <>
                                                <Box
                                                    ref={textInputRef}
                                                    as="input"
                                                    width="100%"
                                                    {...inputProps}
                                                    rounded="sm"
                                                    height="input_sm"
                                                    type="text"
                                                    placeholder="Token ID"
                                                    value={textInputValue}
                                                    border="level4"
                                                    fontSize="xs"
                                                    background="level2"
                                                    color="default"
                                                    paddingX="sm"
                                                    // className={styles.input}
                                                    onClick={onTextInputClick}
                                                    onFocus={onTextInputFocus}
                                                    onChange={onTextInputChange}
                                                    onKeyDown={onTextInputKeyDown}
                                                />
                                                {overlays}
                                            </>
                                        )}
                                    </Field>

                                    <Box
                                        centerContent
                                        tooltip={
                                            <Box background="level4" padding="sm" rounded="sm">
                                                <Text size="sm">
                                                    This is an ERC1155 token and requires a token
                                                    ID.
                                                </Text>
                                            </Box>
                                        }
                                        padding="xs"
                                        rounded="full"
                                        position="absolute"
                                        background="level4"
                                        top="-sm"
                                        right="-sm"
                                        width="x2"
                                        aspectRatio="square"
                                    >
                                        <Text size="xs">?</Text>
                                    </Box>
                                </Box>
                                <IconButton
                                    icon="plus"
                                    color="default"
                                    border="level4"
                                    rounded="full"
                                    size="square_xxs"
                                    type="button"
                                    onClick={onAddTokenClick}
                                />
                            </Box>

                            <Box paddingTop="sm">
                                {tokenIdErrorMessage ? (
                                    <ErrorMessageText size="xs" message={tokenIdErrorMessage} />
                                ) : (
                                    <Text size="xs">&nbsp;</Text>
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
