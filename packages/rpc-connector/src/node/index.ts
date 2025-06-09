import type { Transport } from '@connectrpc/connect'
import type { ConnectTransportOptions } from '../common'
import { createConnectTransport } from '@connectrpc/connect-node'

export function createHttp2ConnectTransport(options: ConnectTransportOptions): Transport {
    return createConnectTransport({ ...options, httpVersion: '2' })
}
