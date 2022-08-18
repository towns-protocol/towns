import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployZionSpaceManager: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // const zionToken = await ethers.getContract("Zion");
  // const zionTokenAddress = zionToken.address;

  //on localhost you need potentially run this again after the first deploy
  //   const zionTokenAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

  const zionSpaceManager = await deploy("ZionSpaceManager", {
    from: deployer,
    args: [],
    log: true,
  });
  log("Deployed Zion Space Manager to address: " + zionSpaceManager.address);
};

deployZionSpaceManager.tags = ["zion-space-manager"];
export default deployZionSpaceManager;
