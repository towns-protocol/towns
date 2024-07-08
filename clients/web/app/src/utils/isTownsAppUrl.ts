// matches subdomains of towns.com, ie. app.towns.com, gamma.towns.com, etc.
// we could harden this by checking for a specific list of subdomains but the
// main purpose is a preemptive check to avoid parsing URLs that are not towns
const domainRegex = /\.towns\.com$/

export const isTownsAppUrl = (url: string) => {
    try {
        const parsedUrl = new URL(url)
        const match = domainRegex.test(parsedUrl.hostname)
        return match
    } catch (e) {
        return false
    }
}
