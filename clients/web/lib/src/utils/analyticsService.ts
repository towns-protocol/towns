import { nanoid } from 'nanoid'
import { datadogRum } from '@datadog/browser-rum'

class AnalyticsService {
    private static instance: AnalyticsService
    private funneId = nanoid()
    private trackedEvents = new Set<string>()

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService()
        }
        return AnalyticsService.instance
    }

    public trackEventOnce(event: string | AnalyticsEvents): void {
        if (this.trackedEvents.has(event)) {
            return
        } else {
            this.trackedEvents.add(event)
        }

        console.log(
            `[AnalyticsService] ${Math.floor(performance.now())} app launch event: ${event}`,
        )

        datadogRum.addAction('appLaunch', {
            [event]: performance.now(),
            funneId: this.funneId,
        })
    }
}

export default AnalyticsService

export enum AnalyticsEvents {
    Welcome = 'welcome',
    ClientWrapperCreated = 'clientWrapperCreated',
    WelcomeLayoutLoadLocalData = 'welcomeLayoutLoadLocalData',
    LoggingIn = 'loggingIn',
    LoggedIn = 'loggedIn',
    PublicTownPage = 'publicTownPage',
    IsMember = 'isMember',
    MessageTimeline = 'messageTimeline',
    SendMessageEditable = 'sendMessageEditable',
}
