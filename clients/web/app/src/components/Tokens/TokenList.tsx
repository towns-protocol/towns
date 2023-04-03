import { ethers } from 'ethers'
import { AnimatePresence } from 'framer-motion'
import uniqBy from 'lodash/uniqBy'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { getMemberNftAddress } from 'use-zion-client'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { MotionBox } from '@components/Transitions/MotionBox'
import { useCreateSpaceFormStore } from '@components/Web3/CreateSpaceForm/CreateSpaceFormStore'
import { Box, Checkbox, Paragraph, Text, TextField, VList } from '@ui'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import { shortAddress } from 'ui/utils/utils'
import { env } from 'utils'
import { fetchVitalikTokens, vitalikAddress } from 'hooks/useNetworkForNftApi'
import { TokenAvatar } from './TokenAvatar'
import { TokenProps } from './types'

export const searchArrayOfData = (array: TokenProps[], query: string): TokenProps[] => {
    const searchTerm = query
    const regEx = new RegExp(searchTerm, 'i')
    return array.filter((obj) =>
        Object.values(obj).some((v) => {
            if (typeof v === 'string') {
                return v.match(regEx)
            }
        }),
    )
}

const TokenCheckboxLabel = ({ imgSrc, label, contractAddress }: TokenProps) => {
    return (
        <Box flexDirection="row" alignItems="center" paddingY="sm">
            <TokenAvatar
                noLabel
                contractAddress={contractAddress}
                size="avatar_x4"
                imgSrc={imgSrc}
            />
            <Box paddingX="md">
                <Text>{label}</Text>
            </Box>
            <Text color="gray2">{shortAddress(contractAddress)}</Text>
        </Box>
    )
}

const loadingMessages = [
    'Grabbing your NFTs...',
    'Still grabbing your NFTs...',
    'Wow, you must have a lot of NFTs...',
    'How long have you been collecting NFTs??',
    'With all these NFTs you could build a bridge to the moon...',
]

const Loader = () => {
    const [message, setMessage] = useState(loadingMessages[0])
    const count = useRef(1)
    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(loadingMessages[count.current])
            count.current = count.current + 1
            if (count.current === loadingMessages.length) {
                clearInterval(interval)
            }
        }, 4000)

        return () => {
            clearInterval(interval)
        }
    }, [])
    return (
        <Box centerContent paddingTop="md" flexDirection="row" gap="md">
            <ButtonSpinner />
            <FadeIn key={message}>
                <Text>{message}</Text>
            </FadeIn>
        </Box>
    )
}

type TokenListProps = {
    isChecked: boolean
    wallet: string
    chainId?: number
} & UseFormReturn

type TokenPropsForVList = TokenProps & { id: string }

export const TokenList = ({ isChecked, setValue, chainId, wallet }: TokenListProps) => {
    const zionTokenAddress = useMemo(
        () => (chainId ? getMemberNftAddress(chainId) : null),
        [chainId],
    )

    const [results, setResults] = React.useState<TokenPropsForVList[]>([])
    const [search, setSearch] = React.useState('')
    const selectedTokens = useCreateSpaceFormStore((state) => state.step1.tokens)
    const toggleToken = useCreateSpaceFormStore((state) => state.toggleToken)

    const { data, isLoading, isError } = useCollectionsForOwner({
        wallet: fetchVitalikTokens ? vitalikAddress : wallet,
        zionTokenAddress,
        enabled: Boolean(chainId),
        chainId,
    })

    useEffect(() => {
        if (!data?.tokens) {
            return
        }
        // TODO: this unique can be removed once we are using the getCollectionsForOwner endpoint
        const unique = uniqBy(data.tokens, 'contractAddress')
        const _results = searchArrayOfData(unique, search).map((res) => ({
            ...res,
            id: res.contractAddress,
        }))
        setResults(_results)
    }, [data?.tokens, search])

    // react-hook-form isn't playing nicely with VList
    // so we're tracking tokens in the store, and manually updating the form value for correct schema validation
    useEffect(() => {
        setValue('tokens', selectedTokens, { shouldValidate: true })
    }, [selectedTokens, setValue])

    const onTokenClick = useCallback(
        (contractAddress: string) => {
            toggleToken(contractAddress)
        },
        [toggleToken],
    )

    const isCustomToken = ethers.utils.isAddress(search) && !results.length
    const noResults = !results.length && !isCustomToken && !isLoading

    const listId = useId()

    return (
        <MotionBox gap layout style={{ originY: 0 }} cursor="default">
            <AnimatePresence mode="popLayout">
                {!selectedTokens.length ? null : data ? (
                    <FadeInBox horizontal fast gap="lg" layout="position" paddingY="md">
                        <AnimatePresence mode="popLayout">
                            {selectedTokens.map((contractAddress: string) => {
                                const token = data.tokens.find(
                                    (t) => t.contractAddress === contractAddress,
                                )
                                return (
                                    <FadeInBox
                                        useScale
                                        key={listId + contractAddress}
                                        layout="position"
                                    >
                                        <TokenAvatar
                                            imgSrc={token?.imgSrc || ''}
                                            label={token?.label || ''}
                                            contractAddress={contractAddress}
                                            size="avatar_md"
                                            onClick={onTokenClick}
                                        />
                                    </FadeInBox>
                                )
                            })}
                        </AnimatePresence>
                    </FadeInBox>
                ) : (
                    <></>
                )}
            </AnimatePresence>
            <MotionBox layout="position">
                <TextField
                    data-testid="token-search"
                    background="level3"
                    placeholder="Search or paste contract address"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </MotionBox>
            {isCustomToken && (
                <Box padding="md" background="level3" rounded="sm">
                    <Checkbox
                        name="tokens"
                        width="100%"
                        value={search}
                        label={
                            <TokenCheckboxLabel
                                contractAddress={search}
                                label="Add token"
                                imgSrc=""
                            />
                        }
                        checked={selectedTokens.includes(search)}
                        onChange={() => onTokenClick(search)}
                    />
                </Box>
            )}
            <AnimatePresence mode="wait">
                {isError && (
                    <FadeInBox key="error">
                        <Paragraph size="sm" color="error">
                            There was an error fetching your tokens
                        </Paragraph>
                    </FadeInBox>
                )}
                {env.IS_DEV && chainId === 31337 && (
                    <FadeInBox key="dev-message" maxWidth="400">
                        <Paragraph size="sm" color="error">
                            DEV message: Localhost will only return the zion token for anvil
                            accounts. To test a long list, add ?vitalikTokens to url. To test your
                            goerli tokens, add ?goerli. Please note that if you use these query
                            params, you may get unexpected behavior in other parts of the app, if
                            you are pointed to local homeserver.
                        </Paragraph>
                    </FadeInBox>
                )}
            </AnimatePresence>
            {isChecked && !isCustomToken && (
                <MotionBox
                    padding
                    layout="position"
                    minHeight="100"
                    maxHeight="500"
                    background="level3"
                    rounded="sm"
                >
                    <Box paddingBottom="md">
                        <Text textTransform="uppercase" color="gray2">
                            Your wallet
                        </Text>
                    </Box>
                    {noResults && (
                        <Box alignSelf="center" paddingTop="sm">
                            No tokens found.
                        </Box>
                    )}
                    <VList<TokenPropsForVList>
                        padding={0}
                        list={results}
                        viewMargin={0}
                        esimtateItemSize={50}
                        itemRenderer={(item) => {
                            return (
                                <Box key={item.contractAddress} paddingX="sm">
                                    <Checkbox
                                        name="tokens"
                                        width="100%"
                                        value={item.contractAddress}
                                        label={<TokenCheckboxLabel {...item} />}
                                        checked={selectedTokens.includes(item.contractAddress)}
                                        onChange={() => onTokenClick(item.contractAddress)}
                                    />
                                </Box>
                            )
                        }}
                    />

                    {isLoading && <Loader />}
                </MotionBox>
            )}
        </MotionBox>
    )
}
