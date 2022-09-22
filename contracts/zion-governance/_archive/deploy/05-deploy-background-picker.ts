import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

////////////////////////////////////////////////////////////////////////////////
// This script deploys a simple contract to vote on the background color and transfers
// ownership of it to the timelock.
////////////////////////////////////////////////////////////////////////////////

const deployBackgroundPicker: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  log("Deploying background picker");

  const backgroundPicker = await deploy("BackgroundPicker", {
    from: deployer,
    args: [],
    log: true,
  });

  const timeLock = await ethers.getContract("TimeLock");
  const backgroundPickerContract = await ethers.getContractAt(
    "BackgroundPicker",
    backgroundPicker.address
  );

  const transferOwnerTx = await backgroundPickerContract.transferOwnership(
    timeLock.address
  );
  await transferOwnerTx.wait(1);

  log("Background picker transfered ownership to ", timeLock.address);
};

export default deployBackgroundPicker;
