import { RunOpts } from './stressTypes'
import { Supervisor } from './stressSupervisor'

export async function runShortChat(opts: RunOpts, supervisor: Supervisor) {
    const { spaceId, defaultChannelId } = await supervisor.first().createTown()

    await supervisor.awaitOthers((d) => d.join(spaceId, [defaultChannelId]))

    // Wait for joins: workers don't scrollback (yet), so expect messages will fail
    await supervisor.waitForJobs()

    const numFirstRound = 10
    await supervisor.awaitAll((d) => d.sendMessages(defaultChannelId, numFirstRound, 'Hello'))

    await supervisor.awaitAll((d) =>
        d.expectMessages(defaultChannelId, numFirstRound * supervisor.numClients(), 'Hello'),
    )

    await supervisor.waitForJobs()

    const numSecondRound = 5
    await supervisor.awaitAll((d) => d.sendMessages(defaultChannelId, numSecondRound, 'Goodbye'))

    await supervisor.awaitAll((d) =>
        d.expectMessages(defaultChannelId, numSecondRound * supervisor.numClients(), 'Goodbye'),
    )
}
