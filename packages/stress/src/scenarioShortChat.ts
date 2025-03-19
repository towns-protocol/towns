import { RunOpts } from './stressTypes'
import { Supervisor } from './stressSupervisor'

export async function runShortChat(opts: RunOpts, supervisor: Supervisor) {
    const { spaceId, defaultChannelId } = await supervisor.first().createTown()

    supervisor.others().forEach((d) => d.join(spaceId, [defaultChannelId]))
}
