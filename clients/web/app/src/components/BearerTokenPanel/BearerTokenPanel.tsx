import React, { useCallback, useState } from 'react'
import { makeBearerToken } from '@river-build/sdk'
import { z } from 'zod'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Dropdown, Paragraph } from '@ui'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { GetSigner, WalletReady } from 'privy/WalletReady'

const EXPIRY_OPTIONS = [
    {
        label: '1 minute',
        value: '1m',
    },
    {
        label: '15 minutes',
        value: '15m',
    },
    {
        label: '30 minutes',
        value: '30m',
    },
    {
        label: '1 hour',
        value: '1h',
    },
    {
        label: '7 days',
        value: '7d',
    },
    {
        label: '1 day',
        value: '1d',
    },
    {
        label: '30 days',
        value: '30d',
    },
]

type ExpiryFormat = {
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
}

const expiryUnits = {
    d: 'days',
    h: 'hours',
    m: 'minutes',
    s: 'seconds',
} satisfies Record<string, keyof ExpiryFormat>

const expiryStringSchema = z
    .string()
    .transform((str) => {
        const regex = new RegExp(`^([0-9]+)(${Object.keys(expiryUnits).join('|')})$`)
        const match = str.match(regex)
        return match
    })
    .transform((match) => {
        if (!match) {
            return null
        }
        const number = parseInt(match[1])
        const unit = match[2]
        return {
            [expiryUnits[unit as keyof typeof expiryUnits]]: number,
        }
    })

const fixPlural = (value: number, singularUnit: string, pluralUnit: string) => {
    return value === 1 ? singularUnit : pluralUnit
}

const expiryToString = (expiry: ExpiryFormat) =>
    Object.entries(expiry).map(
        ([key, value]) => `${value} ${fixPlural(value, key.replace(/s$/, ''), key)}`,
    )
const BearerTokenPanel = () => {
    const [bearerToken, setBearerToken] = useState<string | null>(null)
    const [expiry, setExpiry] = useState<{
        days?: number
        hours?: number
        minutes?: number
        seconds?: number
    } | null>(null)
    const [isLoading, setLoading] = useState(false)

    const generateBearerToken = useCallback(async (expiry: ExpiryFormat, getSigner: GetSigner) => {
        try {
            setLoading(true)
            const signer = await getSigner()
            if (!signer) {
                return
            }
            const token = await makeBearerToken(signer, expiry)
            setLoading(false)
            return token
        } catch (error) {
            console.error('generateBearerToken: ', error)
        } finally {
            setLoading(false)
        }
    }, [])

    return (
        <Panel label="Bearer Token" gap="lg">
            <Paragraph size="sm" color="gray2">
                You can use it to authenticate your account in River.
            </Paragraph>

            <Box gap>
                <Dropdown
                    label="Expiry Time"
                    defaultValue="7d"
                    options={EXPIRY_OPTIONS}
                    onChange={(value) => {
                        const parsedExpiry = expiryStringSchema.parse(value)
                        setBearerToken(null)
                        setExpiry(parsedExpiry)
                    }}
                />
                <WalletReady>
                    {({ getSigner }) => (
                        <Button
                            onClick={async () => {
                                if (!expiry) {
                                    return
                                }
                                const token = await generateBearerToken(expiry, getSigner)
                                setBearerToken(token ?? null)
                            }}
                        >
                            Generate your Bearer Token
                        </Button>
                    )}
                </WalletReady>
            </Box>

            {isLoading && <ButtonSpinner />}
            {bearerToken && expiry && (
                <>
                    <ClipboardCopy
                        clipboardContent={bearerToken}
                        label={bearerToken}
                        color="default"
                    />
                    <Paragraph color="gray2" size="sm" fontWeight="medium">
                        Expires in {expiryToString(expiry)}
                    </Paragraph>
                </>
            )}
        </Panel>
    )
}

export const BearerTokenPrivyWrapper = () => {
    return (
        <PrivyWrapper>
            <BearerTokenPanel />
        </PrivyWrapper>
    )
}
