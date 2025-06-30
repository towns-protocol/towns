import type { Transport } from '@connectrpc/connect'
import type { ConnectTransportOptions } from '../common'
import { createConnectTransport } from '@connectrpc/connect-web'

export function createHttp2ConnectTransport(
    options: ConnectTransportOptions,
): Transport {
    return createConnectTransport(options)
}
