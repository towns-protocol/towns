import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'

export const getRandomClients = (clients: StressClient[], count: number) => {
    return clients.toSorted(() => 0.5 - Math.random()).slice(0, count)
}

export const gdmChat = async (
    client: StressClient,
    gdmStreamId: string,
    chatConfig: ChatConfig,
) => {
    const gdm = client.agent.gdms.getGdm(gdmStreamId)
    return client
        .waitFor(() => gdm.members.data.userIds.includes(client.userId), {
            interval: 200,
            timeoutMs: chatConfig.averageWaitTimeout,
        })
        .catch(() => {})
        .then(() => gdm.sendMessage(`hello ${chatConfig.sessionId}`))
}
