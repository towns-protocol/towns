// TODO: should we use this to only show notifications when the tab is not visible?
export async function checkClientIsVisible(): Promise<boolean> {
    // https://github.com/microsoft/TypeScript/issues/14877
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const windowClients = await new self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
    })

    for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].visibilityState === 'visible') {
            return true
        }
    }

    return false
}
