import React, { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDevice } from 'hooks/useDevice'
import { Box, Icon, IconButton, Paragraph } from '@ui'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { StandardUseropTx } from './StandardUseropTx'
import { UserOpTxModalProvider } from './UserOpTxModalContext'

export function UserOpTxModal() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { promptUser, setPromptResponse } = userOpsStore(
        useShallow((s) => ({
            promptUser: selectUserOpsByAddress(myAbstractAccountAddress, s)?.promptUser,
            setPromptResponse: s.setPromptResponse,
        })),
    )
    const deny = () => setPromptResponse(myAbstractAccountAddress, 'deny')

    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()
    const [disableModalActions, setDisableModalActions] = useState(false)
    const onHide = () => {
        // prevent close while crossmint payment is in progress
        if (disableModalActions) {
            return
        }
        endPublicPageLoginFlow()
        deny?.()
    }
    if (!promptUser) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            padding="none"
            onHide={onHide}
        >
            <ErrorBoundary
                FallbackComponent={({ error }) => (
                    <ErrorContent
                        containerName="UserOpTxModal"
                        error={error}
                        message="There was an error with your transaction. Please log a bug report."
                        onHide={onHide}
                    />
                )}
            >
                <UserOpTxModalProvider>
                    <StandardUseropTx
                        disableModalActions={disableModalActions}
                        setDisableModalActions={setDisableModalActions}
                    />
                </UserOpTxModalProvider>
            </ErrorBoundary>
        </AboveAppProgressModalContainer>
    )
}

export function ErrorContent({
    error,
    onHide,
    containerName,
    message,
}: {
    error: Error
    onHide: () => void
    containerName: string
    message: string
}) {
    useEffect(() => {
        console.error(`[${containerName}]::error`, error)
    }, [containerName, error])
    return (
        <Box centerContent padding>
            <IconButton icon="close" color="default" alignSelf="end" onClick={onHide} />
            <Box centerContent padding gap="lg">
                <Icon type="alert" color="negative" size="square_lg" insetBottom="xs" />
                <Paragraph textAlign="center">Oops! We&apos;ve hit a snag. </Paragraph>
                <Paragraph textAlign="center" color="gray2">
                    {message}
                </Paragraph>
                <AppBugReportButton onClick={onHide} />
            </Box>
        </Box>
    )
}
