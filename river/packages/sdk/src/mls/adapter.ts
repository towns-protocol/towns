/// Adapter to hook MLS Coordinator to the client

import { Client } from '../client'
import { Message } from '@bufbuild/protobuf'
import { EncryptedData } from '@river-build/proto'
import { DLogger, dlog } from '@river-build/dlog'
import { isMobileSafari } from '../utils'
import { IQueueService } from './queue'

const defaultLogger = dlog('csb:mls:adapter')

export class MlsAdapter {
    private client: Client
    private queueService?: IQueueService
    private log!: {
        error: DLogger
        debug: DLogger
    }

    public constructor(client: Client, opts?: { log: DLogger }) {
        this.client = client
        const logger = opts?.log ?? defaultLogger
        this.log = {
            debug: logger.extend('debug'),
            error: logger.extend('error'),
        }
    }

    // API exposed to the client
    public initialize(): Promise<void> {
        this.log.debug('initialize')
        return Promise.resolve()
    }

    public start(): void {
        this.log.debug('start')
        this.queueService?.start()
        if (isMobileSafari() && this.queueService) {
            document.addEventListener(
                'visibilitychange',
                this.queueService.onMobileSafariPageVisibilityChanged,
            )
        }
    }

    public async stop(): Promise<void> {
        this.log.debug('stop')
        await this.queueService?.stop()
        if (isMobileSafari() && this.queueService) {
            document.removeEventListener(
                'visibilitychange',
                this.queueService.onMobileSafariPageVisibilityChanged,
            )
        }
    }

    public async encryptGroupEventEpochSecret(
        _streamId: string,
        _event: Message,
    ): Promise<EncryptedData> {
        this.log.debug('encryptGroupEventEpochSecret')
        throw new Error('Not implemented')
    }
}
