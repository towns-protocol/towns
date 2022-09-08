import { ethers } from "ethers";

/**
 * Server-side only supports reading from the blockchain.
 * Not set up to pay gas fees for writes.
 */
export class ZionContractProvider<T> {
  private address: string;
  private contractInterface: ethers.ContractInterface;
  private provider: ethers.providers.Provider | undefined;
  private readContract: T | undefined;

  constructor(
    address: string,
    contractInterface: ethers.ContractInterface,
    provider: ethers.providers.Provider
  ) {
    this.provider = provider;
    this.address = address;
    this.contractInterface = contractInterface;
  }

  /// get contract for reading from the blockchain
  get read(): T {
    if (!this.provider) {
      throw new Error("No provider");
    }
    if (!this.readContract) {
      this.readContract = new ethers.Contract(
        this.address,
        this.contractInterface,
        this.provider
      ) as unknown as T;
    }
    return this.readContract;
  }
}
