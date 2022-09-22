import { network } from "hardhat";

export async function moveBlocks(numBlocks: number) {
  console.log("Moving " + numBlocks + " blocks");

  for (let i = 0; i < numBlocks; i++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}
