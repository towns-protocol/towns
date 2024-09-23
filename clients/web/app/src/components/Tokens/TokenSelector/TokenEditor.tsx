import React, { useEffect } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TokenType } from '@token-worker/types'
import { Box, Button, IconButton, Stack, Text, TextField } from '@ui'
import { TokenSelectionDisplay } from './TokenSelection'
import { Token } from './tokenSchemas'

export function TokenEditor(props: {
    token: Token
    tokenAlreadyExists: boolean
    onAddOrUpdate: (token: Token) => void
    onHide: () => void
}) {
    const { token, tokenAlreadyExists, onAddOrUpdate, onHide } = props

    const schema = z.object({
        quantity: z
            .string({
                required_error: 'Quantity is required',
                invalid_type_error: 'Quantity must be a string',
            })
            .min(0, 'Quantity is required')
            .refine(
                (val) => {
                    if (token.data.type === TokenType.ERC20) {
                        // For ERC20, allow decimal values
                        const regex = /^\d*\.?\d*$/
                        if (!regex.test(val)) {
                            return false
                        }
                        const number = parseFloat(val)
                        return !isNaN(number) && number > 0
                    } else {
                        // For non-ERC20, keep the original integer check
                        try {
                            const bigIntValue = BigInt(val)
                            return bigIntValue >= 1n
                        } catch {
                            return false
                        }
                    }
                },
                {
                    message: 'Quantity is required',
                },
            ),
        tokenId:
            token.data.type === TokenType.ERC1155
                ? z.string().refine(
                      (val) => {
                          const num = Number(val)
                          return !isNaN(num) && Number.isInteger(num) && num >= 0
                      },
                      {
                          message: 'Token ID is required',
                      },
                  )
                : z.string().optional(),
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
                    {tokenAlreadyExists ? 'Edit Token' : 'Add Token'}
                </Text>
                <IconButton padding="xs" icon="close" onClick={onHide} />
            </Stack>

            <TokenSelectionDisplay token={token} />

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
                                placeholder="Enter a quantity"
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (token.data.type === TokenType.ERC20) {
                                        // Allow decimal input for ERC20 tokens
                                        if (/^\d*\.?\d*$/.test(value)) {
                                            field.onChange(value)
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
                {errors.tokenId && <Text color="error">{errors.tokenId.message}</Text>}

                <Box centerContent>
                    <Button type="submit" tone="cta1">
                        {tokenAlreadyExists ? 'Update' : 'Add'}
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
