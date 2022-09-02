import { ethers } from "ethers";

export class ZionContractProvider<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProvider: () => ethers.providers.Provider | undefined;
  private getSigner: () => ethers.Signer | undefined;
  private address: string;
  private contractInterface: ethers.ContractInterface;

  constructor(
    getProvider: () => ethers.providers.Provider | undefined,
    getSigner: () => ethers.Signer | undefined,
    address: string,
    contractInterface: ethers.ContractInterface,
  ) {
    this.getProvider = getProvider;
    this.getSigner = getSigner;
    this.address = address;
    this.contractInterface = contractInterface;
  }

  /// get contract without signature, for reading from the blockchain
  get unsigned(): T {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error("No provider");
    }
    return new ethers.Contract(
      this.address,
      this.contractInterface,
      provider,
    ) as unknown as T;
  }

  /// get contract with signature, for writing to the blockchain
  get signed() {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer");
    }
    return new ethers.Contract(
      this.address,
      this.contractInterface,
      signer,
    ) as unknown as T;
  }
}
