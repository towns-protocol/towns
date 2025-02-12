import React from 'react'
import { ErrorBoundaryProps, ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

export type { FallbackProps } from 'react-error-boundary'

const handleError = (error: Error) => {
    console.error('[ErrorBoundary] Error:', error)
}

type Props = ErrorBoundaryProps

export const ErrorBoundary = (props: Props) => (
    <ReactErrorBoundary onError={handleError} {...props} />
)
