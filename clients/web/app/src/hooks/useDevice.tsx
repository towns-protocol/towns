import UAParser from 'ua-parser-js'

const UserAgentInstance = new UAParser(window.navigator.userAgent)

export function isTouch() {
    const device = UserAgentInstance.getDevice()
    return device.type === 'mobile' || device.type === 'tablet'
}

export function isIOS() {
    const os = UserAgentInstance.getOS()
    return os.name === 'iOS'
}

export function isMacOS() {
    const os = UserAgentInstance.getOS()
    return os.name === 'Mac OS'
}

export function isSafari() {
    const browser = UserAgentInstance.getBrowser()
    return browser.name === 'Safari'
}

export function isAndroid() {
    const os = UserAgentInstance.getOS()
    return os.name === 'Android'
}

export function isPWA() {
    return matchMedia !== undefined && matchMedia('(display-mode: standalone)').matches
}

export function getBrowserName() {
    const browser = UserAgentInstance.getBrowser()
    return browser.name
}

export function isReduceMotion() {
    return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const device = {
    isTouch: isTouch(),
    isIOS: isIOS,
    isAndroid: isAndroid,
    isPWA: isPWA(),
    isReduceMotion: isReduceMotion(),
}

export function useDevice() {
    return device
}
