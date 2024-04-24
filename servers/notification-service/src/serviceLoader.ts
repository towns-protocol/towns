export interface IStreamsMonitorService {
    addNewStreamsToDB: (streamIds: Set<string>) => Promise<void>
}

let streamsMonitorService: IStreamsMonitorService | undefined

async function loadModule() {
    if (process.env.NODE_ENV !== 'test') {
        return import('./application/services/stream/streamsMonitorService')
    }
    return undefined
}

loadModule().then((module) => {
    streamsMonitorService = module?.StreamsMonitorService.instance
})

export { streamsMonitorService }
