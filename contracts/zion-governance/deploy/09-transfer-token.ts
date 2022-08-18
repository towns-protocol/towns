import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { ADDRESS_ZERO } from "../helper-hardhat-config";
import { BigNumber } from "ethers";

//////////////////////////
//This script transfers 100m tokens to the claim pool and to the GSN claim pool.
//////////////////////////

const setupGovernance: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  console.log(`Starting zion transfer deployer is ${deployer}`);
  const zionToken = await ethers.getContract("Zion", deployer);

  //get relevant contracts
  const tokenAddress = zionToken.address;
  const token = await ethers.getContractAt("ERC20", tokenAddress);
  const claimPool = await ethers.getContract("ClaimPool", deployer);
  const claimPoolGSN = await ethers.getContract("ClaimPoolGSN", deployer);

  const claimPoolAddress = claimPool.address;
  const claimPoolGsnAddress = claimPoolGSN.address;

  //transfer 100m tokens to claim pool and gsn claim pool
  const amount = 100 * 10 ** 6;
  const transferAmount = BigNumber.from(10).pow(18).mul(amount);

  const tokenBalancePrev = await token.balanceOf(deployer);
  const claimPoolBalancePrev = await token.balanceOf(claimPoolAddress);

  console.log(`Token balance   is ${tokenBalancePrev}`);
  console.log(`Claim pool balance   is ${claimPoolBalancePrev}`);

  console.log(
    `Transferring ${transferAmount} tokens from ${deployer} to ${claimPoolAddress}`
  );

  //transfer to normal claim pool
  await token.transfer(claimPoolAddress, transferAmount);

  //transfer to gsn claim pool
  await token.transfer(claimPoolGsnAddress, transferAmount);

  const tokenBalance = await token.balanceOf(deployer);
  const claimPoolBalance = await token.balanceOf(claimPoolAddress);

  console.log(`Token balance   is ${tokenBalance}`);
  console.log(`Claim pool balance   is ${claimPoolBalance}`);
};

export default setupGovernance;
