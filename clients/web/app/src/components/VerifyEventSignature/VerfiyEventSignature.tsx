import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTownsContext } from 'use-towns-client'
import {
    Stream,
    StreamTimelineEvent,
    hasElements,
    publicKeyToAddress,
    recoverPublicKeyFromDelegateSig,
    riverRecoverPubKey,
} from '@river-build/sdk'
import { bin_equal, bin_toHexString } from '@river-build/dlog'
import { Panel } from '@components/Panel/Panel'
import { Paragraph } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

export const VerifyEventSignaturePanel = () => {
    return (
        <Panel label="Verify Event Signature" gap="lg">
            <VerifyEventSignatureContent />
        </Panel>
    )
}

const VerifyEventSignatureContent = () => {
    const { casablancaClient } = useTownsContext()
    const [searchParams] = useSearchParams()
    const eventId = searchParams.get('eventId')
    const streamId = searchParams.get('streamId')
    const [isLoading, setIsLoading] = useState(true)
    const [event, setEvent] = useState<StreamTimelineEvent>()
    const [error, setError] = useState<string>()
    const [recoveredPublicKey, setRecoveredPublicKey] = useState<Uint8Array>()
    const [recoveredPublicKeyFromDelegateSig, setRecoveredPublicKeyFromDelegateSig] =
        useState<Uint8Array>()

    useEffect(() => {
        if (!streamId || !eventId || !casablancaClient) {
            return
        }
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            const doIt = async () => {
                let stream: Stream
                try {
                    stream = await casablancaClient.waitForStream(streamId)
                } catch (e) {
                    console.error(e)
                    setError(`Error waiting for stream`)
                    return
                }
                const event = stream.view.events.get(eventId)
                setEvent(event)
                if (!event) {
                    setError('Event not found')
                    return
                }
                if (!event.remoteEvent) {
                    setError('Remote Event not set')
                    return
                }
                if (!event.remoteEvent?.signature) {
                    setError(
                        'Signature not set. Try deleting your persistence store in indexdb and try again.',
                    )
                    return
                }

                const recoveredPubKeyRaw = riverRecoverPubKey(
                    event.remoteEvent.hash,
                    event.remoteEvent.signature,
                )
                const recoveredPubKey = publicKeyToAddress(recoveredPubKeyRaw)
                setRecoveredPublicKey(recoveredPubKey)

                if (!hasElements(event.remoteEvent.event.delegateSig)) {
                    if (!bin_equal(event.remoteEvent.event.creatorAddress, recoveredPubKey)) {
                        setError('recoveredPublicKey does not match creatorAddress')
                    }
                } else {
                    const recoveredPublicKeyFromDelegateSig = recoverPublicKeyFromDelegateSig({
                        delegatePubKey: recoveredPubKeyRaw,
                        delegateSig: event.remoteEvent.event.delegateSig,
                        expiryEpochMs: event.remoteEvent.event.delegateExpiryEpochMs,
                    })
                    setRecoveredPublicKeyFromDelegateSig(recoveredPublicKeyFromDelegateSig)
                    if (
                        !bin_equal(
                            recoveredPublicKeyFromDelegateSig,
                            event.remoteEvent.event.creatorAddress,
                        )
                    ) {
                        setError('recoveredPublicKeyFromDelegateSig does not match creatorAddress')
                    }
                }
            }
            void doIt()
        }, 33)
    }, [eventId, casablancaClient, streamId])

    if (!casablancaClient) {
        return <Paragraph>Logging in...</Paragraph>
    }

    if (!streamId) {
        return <Paragraph>Invalid streamId Parameter</Paragraph>
    }

    if (!eventId) {
        return <Paragraph>Invalid eventId Parameter</Paragraph>
    }

    return (
        <>
            {isLoading && <ButtonSpinner />}
            {!isLoading && (
                <>
                    <Paragraph color="gray2" size="sm" fontWeight="medium">
                        streamId: {streamId}
                    </Paragraph>
                    <Paragraph color="gray2" size="sm" fontWeight="medium">
                        eventId: {eventId}
                    </Paragraph>
                    {error && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            error: {error}
                        </Paragraph>
                    )}
                    {event?.remoteEvent?.creatorUserId && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            creatorAddress:{' '}
                            {bin_toHexString(event.remoteEvent.event.creatorAddress)}
                        </Paragraph>
                    )}
                    {event?.remoteEvent?.signature && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            signature: {bin_toHexString(event.remoteEvent.signature)}
                        </Paragraph>
                    )}
                    {recoveredPublicKey && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            recoveredPublicKey: {bin_toHexString(recoveredPublicKey)}
                        </Paragraph>
                    )}
                    {event?.remoteEvent?.event.delegateSig && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            delegateSig: {bin_toHexString(event.remoteEvent.event.delegateSig)}
                        </Paragraph>
                    )}
                    {recoveredPublicKeyFromDelegateSig && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            recoveredPublicKeyFromDelegateSig:{' '}
                            {bin_toHexString(recoveredPublicKeyFromDelegateSig)}
                        </Paragraph>
                    )}
                    {!error && (
                        <Paragraph color="gray2" size="sm" fontWeight="medium">
                            Event signature is valid
                        </Paragraph>
                    )}
                </>
            )}
        </>
    )
}
