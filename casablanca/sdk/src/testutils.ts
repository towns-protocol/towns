import { ChannelMessage } from '@river/proto'
import { Client } from './client'
import { makeDonePromise } from './util.test'
import { RiverEventV2 } from './eventV2'

export function getChannelMessagePayload(event?: ChannelMessage) {
    if (event?.payload?.case === 'post') {
        if (event.payload.value.content.case === 'text') {
            return event.payload.value.content.value?.body
        }
    }
    return undefined
}

export function createEventDecryptedPromise(client: Client, expectedMessageText: string) {
    const recipientReceivesMessageWithoutError = makeDonePromise()
    client.on('eventDecrypted', (event: RiverEventV2, error?: Error): void => {
        if (error) {
            return
        }
        recipientReceivesMessageWithoutError.runAndDone(() => {
            const content = event.getContent()
            expect(content).toBeDefined()
            expect(getChannelMessagePayload(content?.content)).toEqual(expectedMessageText)
        })
    })
    return recipientReceivesMessageWithoutError.promise
}
