import { ZionTestClient } from "./ZionTestClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export async function registerAndStartClients(
  clientNames: string[],
): Promise<Record<string, ZionTestClient>> {
  // create new matrix test clients
  const clients = clientNames.map((name) => new ZionTestClient(name));
  // start them up
  await Promise.all(
    clients.map((client) => client.registerWalletAndStartClient()),
  );
  // return a dictionary of clients
  return clients.reduce(
    (records: Record<string, ZionTestClient>, client: ZionTestClient) => {
      records[client.name] = client;
      return records;
    },
    {},
  );
}
