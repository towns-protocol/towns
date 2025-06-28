import { GetSettingsResponse } from '@towns-protocol/proto'
import { Observable } from '../../observable/observable'

export interface NotificationSettingsModel {
    fetchedAtMs: number | undefined
    settings: GetSettingsResponse | undefined
    error: Error | undefined
}

export class NotificationSettings extends Observable<NotificationSettingsModel> {
    constructor() {
        super({
            fetchedAtMs: undefined,
            settings: undefined,
            error: undefined,
        })
    }

    initializeSettings(settings?: GetSettingsResponse) {
        this.set((_prev) => ({
            fetchedAtMs: undefined,
            settings,
            error: undefined,
        }))
    }

    updateSettings(settings: GetSettingsResponse, fetchedAtMs?: number) {
        this.set((prev) => ({
            ...prev,
            fetchedAtMs: fetchedAtMs ?? prev.fetchedAtMs,
            error: undefined,
            settings,
        }))
    }

    updateError(error: Error) {
        this.set((prev) => ({
            ...prev,
            error,
        }))
    }
}
