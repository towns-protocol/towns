import { ZionTestClient } from "./ZionTestClient";
import { ethers } from "ethers";
import { TestConstants } from "./TestConstants";

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

export function makeUniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 4095).toString(
    16,
  )}`;
}

export async function fundWallet(walletToFund: ethers.Wallet, amount = 0.1) {
  const fundedWallet = TestConstants.FUNDED_WALLET_0;
  const tx = {
    from: fundedWallet.address,
    to: walletToFund.address,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: 1000000,
  };
  const result = await fundedWallet.sendTransaction(tx);
  return result;
}
