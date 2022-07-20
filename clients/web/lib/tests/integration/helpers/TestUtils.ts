import { MatrixTestClient } from "./MatrixTestClient";

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

export async function registerAndStartClients(
  clientNames: string[],
): Promise<Record<string, MatrixTestClient>> {
  // create new matrix test clients
  const clients = clientNames.map((name) => new MatrixTestClient(name));
  // start them up
  await Promise.all(
    clients.map((client) => client.registerWalletAndStartClient()),
  );
  // return a dictionary of clients
  return clients.reduce(
    (records: Record<string, MatrixTestClient>, client: MatrixTestClient) => {
      records[client.name] = client;
      return records;
    },
    {},
  );
}
