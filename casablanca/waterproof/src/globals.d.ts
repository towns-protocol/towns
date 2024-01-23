declare module globalThis {
    // OlmLib fails initialization if this is not defined
    // eslint-disable-next-line no-var
    var OLM_OPTIONS: Record<string, unknown>
}
