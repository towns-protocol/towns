// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepUntil<T>(
  thisObject: T,
  condition: (x: T) => boolean,
  timeoutMs = 2000,
  checkEveryMs = 100,
): Promise<boolean> {
  let currentMs = 0;

  while (currentMs <= timeoutMs) {
    if (condition(thisObject)) {
      return true;
    }
    await sleep(checkEveryMs);
    currentMs += checkEveryMs;
  }

  return false;
}
