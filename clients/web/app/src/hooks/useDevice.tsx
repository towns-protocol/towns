import UAParser from 'ua-parser-js'

const UserAgentInstance = new UAParser(window.navigator.userAgent)

export function isTouch() {
    const device = UserAgentInstance.getDevice()
    return device.type === 'mobile' || device.type === 'tablet'
}

function isIOS() {
    const os = UserAgentInstance.getOS()
    return os.name === 'iOS'
}

function isAndroid() {
    const os = UserAgentInstance.getOS()
    return os.name === 'Android'
}

export function useDevice() {
    return {
        isTouch: isTouch(),
        isIOS: isIOS,
        isAndroid: isAndroid,
        isPWA: matchMedia !== undefined && matchMedia('(display-mode: standalone)').matches,
    }
}
