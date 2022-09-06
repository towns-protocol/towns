import { ethers } from "ethers";
import { getChainHexString } from "../../../src/hooks/login";
import { fundWallet } from "./TestUtils";
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

export class ZionTestWeb3Provider extends ethers.providers.JsonRpcProvider {
  // note to self, the wallet contains a reference to a provider, which is a circular ref back this class
  public wallet: ethers.Wallet;

  constructor() {
    const networkUrl = process.env.ETHERS_NETWORK!;
    super(networkUrl);
    this.wallet = ethers.Wallet.createRandom().connect(this);
    console.log("initializing web3 provider with wallet", this.wallet.address);
  }

  public async fundWallet(amount = 0.1) {
    return fundWallet(this.wallet, amount);
  }

  public async request({
    method,
    params = [] as unknown[],
  }: {
    method: string;
    params?: unknown[];
  }) {
    if (method === "eth_accounts") {
      return [this.wallet.address];
    } else if (method === "eth_chainId") {
      const network = await this.getNetwork();
      return getChainHexString(network.chainId);
    } else if (method === "personal_sign") {
      return this.wallet.signMessage((params as string[])[0]);
    } else {
      return this.send(method, params);
    }
  }
}
