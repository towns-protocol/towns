export function useDevice() {
    return {
        isTouch: matchMedia !== undefined && matchMedia('(hover: none)').matches,
    }
}
