/***
 * This transformation replaces/masks sensitive personal data, e.g., email, birthday,
 * social security number. You can mention properties to be masked in the code (e.g., SSN)
 * and define the manner to be masked. This reduces the risk of accidentally disclosing
 * personally identifiable information (PII).
 ***/

export function transformEvent(event, metadata) {
    const page = event.context?.page
    const properties = event.properties
    if (page?.search) {
        event.context.page.search = removePrivyOAuthParams(page.search)
    }
    if (page?.tab_url) {
        event.context.page.tab_url = removePrivyOAuthParams(page.tab_url)
    }
    if (page?.url) {
        event.context.page.url = removePrivyOAuthParams(page.url)
    }
    if (properties?.search) {
        event.properties.search = removePrivyOAuthParams(properties.search)
    }
    if (properties?.tab_url) {
        event.properties.tab_url = removePrivyOAuthParams(properties.tab_url)
    }
    if (properties?.url) {
        event.properties.url = removePrivyOAuthParams(properties.url)
    }
    return event
}

function removePrivyOAuthParams(url) {
    // Define the regular expression to match the parameters
    const regex = /([&?])(privy_oauth_state=[^&]*|privy_oauth_code=[^&]*)(?=&|$)/g

    // Replace the matched parameters with an empty string
    let newUrl = url.replace(regex, (match, p1, p2) => {
        // Determine if the match is at the start of the query string
        if (p1 === '?') {
            // If it is the start and followed by another parameter, replace '?' with '?'
            return match.charAt(p1.length + p2.length) === '&' ? '?' : ''
        } else {
            // Otherwise, replace the parameter and preceding '&' with an empty string
            return ''
        }
    })

    // Clean up the URL by removing any trailing '&' or '?'
    newUrl = newUrl.replace(/[&?]$/, '')

    return newUrl
}
