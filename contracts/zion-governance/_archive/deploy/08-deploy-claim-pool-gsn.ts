import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

////////////////////////////////////////////////////////////////////////////////
// This script deploys the GSN claim pool and requires the Forwarder address for the paymaster
////////////////////////////////////////////////////////////////////////////////

const deployClaimPoolGSN: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // const zionToken = await ethers.getContract("Zion");
  // const zionTokenAddress = zionToken.address;

  //on localhost you need potentially run this again after the first deploy
  const zionTokenAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

  //on localhost you will need to set this from the gsn start command
  const forwarder = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  //   const forwarder = require("../build/gsn/Forwarder").address;

  const claimPool = await deploy("ClaimPoolGSN", {
    from: deployer,
    args: [zionTokenAddress, forwarder],
    log: true,
  });
  log("Deployed Claim Pool GSN** to address: " + claimPool.address);
};

deployClaimPoolGSN.tags = ["claim-pool-gsn"];
export default deployClaimPoolGSN;
