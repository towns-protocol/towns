import { dlog, dlogError } from '@river-build/dlog'

export const logInfo = dlog('csb:debug-app:info')

export const logError = dlogError('csb:debug-app:error')

export function testLogError(e: any) {
    logError('testLogError', 123, e, 'more text')
}
