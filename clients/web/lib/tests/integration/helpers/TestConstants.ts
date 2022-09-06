/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ethers } from "ethers";

export class TestConstants {
  public static get FUNDED_WALLET_0(): ethers.Wallet {
    const network = process.env.ETHERS_NETWORK!;
    const privateKey = process.env.FUNDED_WALLET_PRIVATE_KEY_0!;
    const provider = new ethers.providers.JsonRpcProvider(network);
    return new ethers.Wallet(privateKey, provider);
  }
}
