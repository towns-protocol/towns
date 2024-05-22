// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.s.sol";

abstract contract Interaction is Script, DeployBase {
  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function __interact(address deployer) public virtual;

  // will first try to load existing deployments from `deployments/<network>/<contract>.json`
  // if OVERRIDE_DEPLOYMENTS is set or if no deployment is found:
  // - read PRIVATE_KEY from env
  // - invoke __deploy() with the private key
  // - save the deployment to `deployments/<network>/<contract>.json`
  function interact() public virtual {
    uint256 pk = isAnvil() ? vm.envUint("LOCAL_PRIVATE_KEY") : isRiver()
      ? vm.envUint("RIVER_PRIVATE_KEY")
      : vm.envUint("TESTNET_PRIVATE_KEY");

    address potential = vm.addr(pk);
    address deployer = isAnvil() ? potential : msg.sender != potential
      ? msg.sender
      : potential;

    info(
      string.concat(
        unicode"running interaction",
        unicode"\n\t⚡️ on ",
        chainIdAlias(),
        unicode"\n\t📬 from deployer address"
      ),
      vm.toString(deployer)
    );

    __interact(deployer);

    info(unicode"🎉🎉", " interaction complete");
  }

  function run() public virtual {
    interact();
  }
}
