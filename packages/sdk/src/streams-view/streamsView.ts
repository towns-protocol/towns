import { TimelinesView, TimelinesViewDelegate } from './timelinesView'

export type StreamsViewDelegate = TimelinesViewDelegate

// a view of all the streams
export class StreamsView {
    readonly timelinesView: TimelinesView

    // todo invert this so we don't have to pass the whole client
    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        this.timelinesView = new TimelinesView(userId, delegate)
    }
}
