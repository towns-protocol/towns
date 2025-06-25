import { ObservableRecord } from '../../observable/observableRecord'

export interface ChannelStreamModel {
    streamId: string
}

export class ChannelStreamsView extends ObservableRecord<string, ChannelStreamModel> {
    constructor() {
        super({
            makeDefault: (streamId: string): ChannelStreamModel => ({ streamId }),
        })
    }
}
