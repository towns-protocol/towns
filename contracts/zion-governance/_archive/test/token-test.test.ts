import { expect } from "chai";

import { ethers, deployments, getNamedAccounts } from "hardhat";

describe("Token contract", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    await deployments.fixture(["Zion"]);
    console.log("Deployed Zion token");
    const { deployer } = await getNamedAccounts();
    console.log("Got token deployer: ", deployer);
    const Token = await ethers.getContract("Zion");
    console.log("Token address is ", Token.address);
    const ownerBalance = await Token.balanceOf(deployer);
    const supply = await Token.totalSupply();
    console.log(`Owner balance is ${ownerBalance}`);
    console.log(`Total supply is ${supply}`);
    expect(ownerBalance).to.equal(supply);
  });
});
