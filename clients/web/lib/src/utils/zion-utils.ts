export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepUntil<T, R>(
  thisObject: T,
  condition: (x: T) => R,
  timeoutMs = 2000,
  checkEveryMs = 100,
): Promise<R | undefined> {
  let currentMs = 0;

  while (currentMs <= timeoutMs) {
    const result = condition(thisObject);
    if (result) {
      return result;
    }
    await sleep(checkEveryMs);
    currentMs += checkEveryMs;
  }

  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function invariant(cond: any, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

export function staticAssertNever(x: never): never {
  throw new Error("Unexpected object: ", x);
}

/// quick and dirty way to ensure simple arrays are equal, if you need
/// more functionality, use a library like lodash
export function arraysAreEqual<T extends string | number>(
  array1: T[],
  array2: T[],
) {
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}
