import React, { useEffect } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { constants } from 'ethers'
import { TokenType } from '@token-worker/types'
import { Box, Button, IconButton, Stack, Text, TextField } from '@ui'
import { TokenSelectionDisplay } from './TokenSelection'
import { Token } from './tokenSchemas'

export function TokenEditor(props: {
    token: Token
    tokenAlreadyExists: boolean
    onAddOrUpdate: (token: Token) => void
    onEthBalanceChange: (balance: string) => void
    onHide: () => void
}) {
    const { token, tokenAlreadyExists, onAddOrUpdate, onEthBalanceChange, onHide } = props

    const isNativeToken = token.data.address === constants.AddressZero

    const schema = z.object({
        tokenId:
            token.data.type === TokenType.ERC1155
                ? z
                      .string({
                          required_error: 'Token ID is required',
                          invalid_type_error: 'Token ID must be a string',
                      })
                      .min(0, 'Token ID is required')
                      .refine(
                          (val) => {
                              if (val === '0') {
                                  return true
                              }
                              const num = Number(val)
                              return (
                                  val === undefined ||
                                  (val.length > 0 &&
                                      !isNaN(num) &&
                                      Number.isInteger(num) &&
                                      num > 0 &&
                                      !val.startsWith('0'))
                              )
                          },
                          {
                              message: 'Token ID is invalid',
                          },
                      )
                : z.string().optional(),
        quantity: z
            .string({
                required_error: 'Quantity is required',
                invalid_type_error: 'Quantity must be a string',
            })
            .min(0, 'Quantity is required')
            .refine(
                (val) => {
                    if (token.data.type === TokenType.ERC20) {
                        // For ERC20, allow decimal values without leading zeros
                        const regex = /^(0|[1-9]\d*)(\.\d+)?$/
                        if (!regex.test(val)) {
                            return false
                        }
                        const number = parseFloat(val)
                        return !isNaN(number) && number > 0
                    } else {
                        // For non-ERC20, keep the integer check without leading zeros
                        const regex = /^(0|[1-9]\d*)$/
                        if (!regex.test(val)) {
                            return false
                        }
                        const bigIntValue = BigInt(val)
                        return bigIntValue >= 1n
                    }
                },
                {
                    message: 'Quantity is invalid',
                },
            ),
    })

    const {
        control,
        handleSubmit,
        formState: { errors },
        setFocus,
    } = useForm<{ quantity: string; tokenId?: string }>({
        resolver: zodResolver(schema),
        defaultValues: {
            quantity: token.data.quantity,
            tokenId: token.data.tokenId,
        },
    })

    const onSubmit = (data: { quantity: string; tokenId?: string }) => {
        if (isNativeToken) {
            onEthBalanceChange(data.quantity)
        } else {
            onAddOrUpdate({
                ...token,
                data: {
                    ...token.data,
                    quantity: data.quantity,
                    // Only add tokenId if the token is ERC1155
                    ...(token.data.type === TokenType.ERC1155 &&
                        data.tokenId && { tokenId: data.tokenId }),
                },
            })
        }
        onHide()
    }

    useEffect(() => {
        if (!tokenAlreadyExists && token.data.type === TokenType.ERC1155) {
            setFocus('tokenId')
        } else {
            setFocus('quantity')
        }
    }, [setFocus, tokenAlreadyExists, token.data.type])

    return (
        <Box centerContent gap="md" padding="md" width="100%" data-testid="token-editor">
            <Stack
                justifyContent="spaceBetween"
                flexDirection="row"
                alignItems="center"
                width="100%"
            >
                <Box width="x3" />
                <Text strong size="lg">
                    {isNativeToken ? 'Require ETH' : `${tokenAlreadyExists ? 'Edit' : 'Add'} Token`}
                </Text>
                <IconButton padding="xs" icon="close" onClick={onHide} />
            </Stack>

            <TokenSelectionDisplay
                token={{
                    ...token,
                    data: {
                        ...token.data,
                        quantity: '',
                    },
                }}
            />

            <Box as="form" style={{ width: '100%' }} gap="md" onSubmit={handleSubmit(onSubmit)}>
                {token.data.type === TokenType.ERC1155 && !tokenAlreadyExists && (
                    <Box gap alignSelf="start" width="100%">
                        <Text>Token ID</Text>
                        <Controller
                            name="tokenId"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="text"
                                    inputMode="numeric"
                                    tone="neutral"
                                    background="level2"
                                    placeholder="Enter token ID"
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (/^\d*$/.test(value)) {
                                            field.onChange(value)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (
                                            !/^\d$/.test(e.key) &&
                                            e.key !== 'Backspace' &&
                                            e.key !== 'Delete' &&
                                            e.key !== 'ArrowLeft' &&
                                            e.key !== 'ArrowRight'
                                        ) {
                                            e.preventDefault()
                                        }
                                    }}
                                />
                            )}
                        />
                    </Box>
                )}
                {errors.tokenId && <Text color="error">{errors.tokenId.message}</Text>}
                <Box gap alignSelf="start" width="100%">
                    <Text>Quantity</Text>
                    <Controller
                        name="quantity"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                type="text"
                                tone="neutral"
                                background="level2"
                                placeholder="Enter quantity"
                                data-testid="token-quantity-input-field"
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (token.data.type === TokenType.ERC20) {
                                        // Allow decimal input for ERC20 tokens, limited by token decimals
                                        const parts = value.split('.')
                                        if (parts.length <= 2 && /^\d*\.?\d*$/.test(value)) {
                                            const maxDecimals = token.data.decimals ?? 18
                                            if (
                                                parts.length === 2 &&
                                                parts[1].length > maxDecimals
                                            ) {
                                                // Truncate to allowed number of decimals
                                                field.onChange(
                                                    `${parts[0]}.${parts[1].slice(0, maxDecimals)}`,
                                                )
                                            } else {
                                                field.onChange(value)
                                            }
                                        }
                                    } else {
                                        // Only allow integer input for non-ERC20 tokens
                                        if (/^\d*$/.test(value)) {
                                            field.onChange(value)
                                        }
                                    }
                                }}
                            />
                        )}
                    />
                </Box>
                {errors.quantity && <Text color="error">{errors.quantity.message}</Text>}

                <Box centerContent>
                    <Button type="submit" tone="cta1" data-testid="add-tokens-button">
                        {tokenAlreadyExists ||
                        (isNativeToken && token.data.quantity && token.data.quantity !== '0')
                            ? 'Update'
                            : 'Add'}{' '}
                        {isNativeToken ? 'ETH Requirement' : 'Token'}
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
