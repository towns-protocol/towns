import React, { useCallback, useState } from 'react'
import { useGetEmbeddedSigner } from '@towns/privy'
import { makeBearerToken } from '@river-build/sdk'
import { Panel } from '@components/Panel/Panel'
import { Button, Paragraph } from '@ui'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

const BearerTokenPanel = () => {
    const { isPrivyReady, getSigner } = useGetEmbeddedSigner()
    const [bearerToken, setBearerToken] = useState<string | null>(null)
    const [isLoading, setLoading] = useState(false)
    const generateBearerToken = useCallback(async () => {
        setLoading(true)
        const signer = await getSigner()
        if (!signer) {
            return
        }
        const token = await makeBearerToken(signer, { days: 7 })
        setLoading(false)
        return token
    }, [getSigner])

    return (
        <Panel label="Bearer Token">
            <Paragraph size="sm" color="gray2">
                You can use it to authenticate your account in River.
            </Paragraph>
            <Button
                disabled={!isPrivyReady}
                onClick={async () => {
                    const token = await generateBearerToken()
                    setBearerToken(token ?? null)
                }}
            >
                Generate your auth token
            </Button>

            {isLoading && <ButtonSpinner />}
            {bearerToken && (
                <>
                    <ClipboardCopy
                        clipboardContent={bearerToken}
                        label={bearerToken}
                        color="default"
                    />
                    <Paragraph color="gray2" size="sm" fontWeight="medium">
                        Expires in 7 days.
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
