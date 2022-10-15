import { Action, ActionGuard } from '@zion/core';
export declare class DumbActionGuard implements ActionGuard {
    isAllowed(actor: string, action: Action, object?: string): Promise<boolean>;
}
//# sourceMappingURL=dumbActionGuard.d.ts.map