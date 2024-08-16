// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.s.sol";

abstract contract Deployer is Script, DeployBase {
  // override this with the name of the deployment version that this script deploys
  function versionName() public view virtual returns (string memory);

  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function __deploy(address deployer) public virtual returns (address);

  // will first try to load existing deployments from `deployments/<network>/<contract>.json`
  // if OVERRIDE_DEPLOYMENTS is set to true or if no cached deployment is found:
  // - read PRIVATE_KEY from env
  // - invoke __deploy() with the private key
  // - save the deployment to `deployments/<network>/<contract>.json`
  function deploy() public virtual returns (address deployedAddr) {
    bool overrideDeployment = vm.envOr("OVERRIDE_DEPLOYMENTS", uint256(0)) > 0;

    address existingAddr = isTesting()
      ? address(0)
      : getDeployment(versionName());

    if (!overrideDeployment && existingAddr != address(0)) {
      info(
        string.concat(
          unicode"📝 using an existing address for ",
          versionName(),
          " at"
        ),
        vm.toString(existingAddr)
      );
      return existingAddr;
    }

    uint256 pk = isAnvil()
      ? vm.envUint("LOCAL_PRIVATE_KEY")
      : vm.envUint("TESTNET_PRIVATE_KEY");

    address potential = vm.addr(pk);
    address deployer = isAnvil()
      ? potential
      : msg.sender != potential
        ? msg.sender
        : potential;

    if (!isTesting()) {
      info(
        string.concat(
          unicode"deploying \n\t📜 ",
          versionName(),
          unicode"\n\t⚡️ on ",
          chainIdAlias(),
          unicode"\n\t📬 from deployer address"
        ),
        vm.toString(deployer)
      );
    }

    // call __deploy hook
    deployedAddr = __deploy(deployer);

    if (!isTesting()) {
      info(
        string.concat(unicode"✅ ", versionName(), " deployed at"),
        vm.toString(deployedAddr)
      );

      if (deployedAddr != address(0)) {
        saveDeployment(versionName(), deployedAddr);
      }
    }

    if (!isTesting()) postDeploy(deployer, deployedAddr);
  }

  function postDeploy(address deployer, address deployment) public virtual {}

  function run() public virtual {
    bytes memory data = abi.encodeWithSignature("deploy()");

    (bool success, bytes memory returnData) = address(this).delegatecall(data);
    if (!success) {
      if (returnData.length > 0) {
        /// @solidity memory-safe-assembly
        assembly {
          let returnDataSize := mload(returnData)
          revert(add(32, returnData), returnDataSize)
        }
      } else {
        revert("FAILED_TO_CALL: deploy()");
      }
    }
  }
}
