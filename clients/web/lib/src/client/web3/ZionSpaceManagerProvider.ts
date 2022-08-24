import { ethers } from "ethers";
import ZionSpaceManagerArtifact from "@harmony/contracts/governance/artifacts/ZionSpaceManager.json";
import { ZionSpaceManager } from "@harmony/contracts/governance";

export class ZionSpaceManagerProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getProvider: () => ethers.providers.Provider | undefined;
  private getSigner: () => ethers.Signer | undefined;
  private address: string;

  constructor(
    getProvider: () => ethers.providers.Provider | undefined,
    getSigner: () => ethers.Signer | undefined,
    address: string,
  ) {
    this.getProvider = getProvider;
    this.getSigner = getSigner;
    this.address = address;
  }

  private get artifiact() {
    if (!ZionSpaceManagerArtifact) {
      // we have an issue in the tests where the import declared above is undefined... this is a hack to get around it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return require("@harmony/contracts/governance/artifacts/ZionSpaceManager.json");
    }
    return ZionSpaceManagerArtifact;
  }

  get contract(): ZionSpaceManager {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error("No provider");
    }
    return new ethers.Contract(
      this.address,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      this.artifiact.abi,
      provider,
    ) as ZionSpaceManager;
  }

  get signedContract() {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer");
    }
    console.log("artifiact", this.artifiact);
    return new ethers.Contract(
      this.address,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      this.artifiact.abi,
      signer,
    ) as ZionSpaceManager;
  }
}
