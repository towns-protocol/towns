import UAParser from 'ua-parser-js'

const UserAgentInstance = new UAParser(window.navigator.userAgent)

const parseUserAgent = () => {
    return {
        UA: UserAgentInstance,
        browser: UserAgentInstance.getBrowser(),
        cpu: UserAgentInstance.getCPU(),
        device: UserAgentInstance.getDevice(),
        engine: UserAgentInstance.getEngine(),
        os: UserAgentInstance.getOS(),
        ua: UserAgentInstance.getUA(),
    }
}

export function useDevice() {
    const { device } = parseUserAgent()
    return {
        isMobile: device.type === 'mobile' || device.type === 'tablet',
    }
}
