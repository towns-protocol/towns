export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepUntil<T>(
  thisObject: T,
  condition: (x: T) => boolean | undefined,
  timeoutMs = 2000,
  checkEveryMs = 100,
): Promise<boolean> {
  let currentMs = 0;

  while (currentMs <= timeoutMs) {
    if (condition(thisObject) === true) {
      return true;
    }
    await sleep(checkEveryMs);
    currentMs += checkEveryMs;
  }

  return false;
}
