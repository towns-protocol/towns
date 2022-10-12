import ZionSpaceManagerArtifact from "@harmony/contracts/localhost/abis/ZionSpaceManager.json";
import CouncilNFTArtifact from "@harmony/contracts/localhost/abis/CouncilNFT.json";
import CouncilStakingArtifact from "@harmony/contracts/localhost/abis/CouncilStaking.json";
import { ethers } from "ethers";

export function zionSpaceManagerAbi(): ethers.ContractInterface {
  return ZionSpaceManagerArtifact.abi;
}

export function zionCouncilNFTAbi(): ethers.ContractInterface {
  return CouncilNFTArtifact.abi;
}

export function zionCouncilStakingAbi(): ethers.ContractInterface {
  return CouncilStakingArtifact.abi;
}
