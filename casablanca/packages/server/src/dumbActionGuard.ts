import { Action, ActionGuard } from '@zion/core'
import debug from 'debug'

const log_action = debug('zion:action_guard')

export class DumbActionGuard implements ActionGuard {
    async isAllowed(actor: string, action: Action, object?: string): Promise<boolean> {
        log_action('DumbActionGuard', actor, action, object)
        return true
    }
}
