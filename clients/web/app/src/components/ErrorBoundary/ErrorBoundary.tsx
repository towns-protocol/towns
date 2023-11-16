import React from 'react'
import { datadogRum } from '@datadog/browser-rum'
import { ErrorBoundaryProps, ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

export type { FallbackProps } from 'react-error-boundary'

const handleError = (error: Error) => {
    datadogRum.addError(error)
}

type Props = ErrorBoundaryProps

export const ErrorBoundary = (props: Props) => (
    <ReactErrorBoundary onError={handleError} {...props} />
)
