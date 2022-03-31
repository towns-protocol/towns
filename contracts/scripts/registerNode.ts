/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { NodeManager__factory } from "../../typechain-types/index";

async function main() {
  const contractAddress = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed";
  const nodeHash =
    "0xaa1acf32ea907a8945923aff29aa89cd352aa6c381c77e918457111479b15a8c";

  console.log(`params ${contractAddress} ${nodeHash}`);
  const overrides = {
    value: ethers.utils.parseEther("10"),
  };
  const [signer] = await ethers.getSigners();

  const nodeManager = NodeManager__factory.connect(contractAddress, signer);
  nodeManager.registerNode(nodeHash, "localhost2.com", overrides);
  console.log("NodeManager registerNode to:", nodeHash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
