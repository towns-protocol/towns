// matches subdomains of towns.com, ie. app.towns.com, gamma.towns.com, etc.
// we could harden this by checking for a specific list of subdomains but the

// main purpose is a preemptive check to avoid parsing URLs that are not towns
const domainRegex = /\.towns\.com$/

const hostname = import.meta.env.DEV
    ? // shortcut for debugging, mapping this to ENVs would add unnecessary overhead on production
      'app.gamma.towns.com'
    : new URL(window.location.href).hostname

export const isTownsAppUrl = (url: string) => {
    try {
        const parsedUrl = new URL(url)
        return domainRegex.test(parsedUrl.hostname) && parsedUrl.hostname === hostname
    } catch (e) {
        return false
    }
}
