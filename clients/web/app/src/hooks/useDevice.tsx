export function useDevice() {
    return {
        isTouch: matchMedia !== undefined && matchMedia('(hover: none)').matches,
        isPWA: matchMedia !== undefined && matchMedia('(display-mode: standalone)').matches,
    }
}
