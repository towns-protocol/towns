import { network, ethers } from "hardhat";
import { DEVELOPMENT_CHAINS, VOTING_PERIOD } from "../helper-hardhat-config";
import { moveBlocks } from "../utils/move-blocks";

async function main(proposalIndex: number) {
  const chainId = network.config.chainId!.toString();
  console.log(`ChainId is ${chainId}`);

  const spaceName = "Test Space Uno";

  await fetchSpace(0);
  await fetchSpace(1);
  await fetchSpace(2);
}

export async function fetchSpace(spaceId: number) {
  console.log(`Fetching space: ${spaceId}`);

  const zionSpaceManager = await ethers.getContract("ZionSpaceManager");

  const entitlementModule = await ethers.getContract(
    "UserGrantedEntitlementModule"
  );

  const spaceValues = await zionSpaceManager.getSpaceInfoBySpaceId(spaceId);
  console.log("SpaceValues are ", spaceValues);

  const entitlementModuleAddress = await zionSpaceManager.getSpaceEntitlementModuleAddresses(
    spaceId
  );

  console.log("Addresses are ", entitlementModuleAddress);
  console.log("UserGrantedEntitlementManager is ", entitlementModule.address);

  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  //   const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const userEntitlements = await entitlementModule.getUserEntitlements(
    spaceId,
    0,
    testAddress
  );
  console.log("UserEntitlements are ", userEntitlements);

  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveBlocks(VOTING_PERIOD + 1);
  }
}

const index = 0;
main(index)
  .then(() => {
    console.log("Done fetching space from main");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
