import React, { useCallback, useState } from 'react'
import { useGetEmbeddedSigner } from '@towns/privy'
import { makeAuthToken } from '@river-build/sdk'
import { Panel } from '@components/Panel/Panel'
import { Button, Paragraph } from '@ui'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

const AuthTokenPanel = () => {
    const { isPrivyReady, getSigner } = useGetEmbeddedSigner()
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [isLoading, setLoading] = useState(false)
    const generateAuthToken = useCallback(async () => {
        setLoading(true)
        const signer = await getSigner()
        if (!signer) {
            return
        }
        const token = await makeAuthToken(signer, { days: 7 })
        setLoading(false)
        return token
    }, [getSigner])

    return (
        <Panel label="Auth Token">
            <Paragraph size="sm" color="gray2">
                You can use it to authenticate your account in River.
            </Paragraph>
            <Button
                disabled={!isPrivyReady}
                onClick={async () => {
                    const token = await generateAuthToken()
                    setAuthToken(token ?? null)
                }}
            >
                Generate your auth token
            </Button>

            {isLoading && <ButtonSpinner />}
            {authToken && (
                <>
                    <ClipboardCopy clipboardContent={authToken} label={authToken} color="default" />
                    <Paragraph color="gray2" size="sm" fontWeight="medium">
                        Expires in 7 days.
                    </Paragraph>
                </>
            )}
        </Panel>
    )
}

export const AuthTokenPrivyWrapper = () => {
    return (
        <PrivyWrapper>
            <AuthTokenPanel />
        </PrivyWrapper>
    )
}
