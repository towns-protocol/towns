// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./Deployer.s.sol";

import {Diamond} from "contracts/src/diamond/Diamond.sol";

abstract contract DiamondDeployer is Deployer {
  uint256 index = 0;

  function __deploy(uint256, address) public pure override returns (address) {
    return address(0);
  }

  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function diamondInitParams(
    uint256 deployerPrivateKey,
    address deployer
  ) public virtual returns (Diamond.InitParams memory);

  // will first try to load existing deployments from `deployments/<network>/<contract>.json`
  // if OVERRIDE_DEPLOYMENTS is set or if no deployment is found:
  // - read PRIVATE_KEY from env
  // - invoke __deploy() with the private key
  // - save the deployment to `deployments/<network>/<contract>.json`
  function deploy() public virtual override returns (address deployedAddr) {
    address existingAddr = getDeployment(versionName());
    bool overrideDeployment = vm.envOr("OVERRIDE_DEPLOYMENTS", uint256(0)) > 0;

    if (!overrideDeployment && existingAddr != address(0)) {
      debug(
        string.concat("found existing ", versionName(), " deployment at"),
        existingAddr
      );
      debug("(override with OVERRIDE_DEPLOYMENTS=1)");
      return existingAddr;
    }

    uint256 pk = isAnvil()
      ? vm.envUint("LOCAL_PRIVATE_KEY")
      : vm.envUint("PRIVATE_KEY");

    address deployer = vm.addr(pk);

    info(
      string.concat(
        unicode"deploying \n\t📜 ",
        versionName(),
        unicode"\n\t⚡️ on ",
        chainAlias(),
        unicode"\n\t📬 from deployer address"
      ),
      vm.toString(deployer)
    );

    Diamond.InitParams memory initParams = diamondInitParams(pk, deployer);

    vm.broadcast(pk);
    deployedAddr = address(new Diamond(initParams));

    info(
      string.concat(unicode"✅ ", versionName(), " deployed at"),
      vm.toString(deployedAddr)
    );

    saveDeployment(versionName(), deployedAddr);

    _afterDeployment(pk, deployer, deployedAddr);
  }

  function _afterDeployment(
    uint256 pk,
    address deployer,
    address diamond
  ) internal virtual {}

  function _resetIndex() internal {
    index = 0;
  }
}
