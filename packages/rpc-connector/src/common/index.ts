import { ConnectTransportOptions as ConnectTransportOptionsWeb } from '@connectrpc/connect-web'

export * from '@connectrpc/connect'

/** Using the web version of the transport options as a common type */
export type ConnectTransportOptions = ConnectTransportOptionsWeb
