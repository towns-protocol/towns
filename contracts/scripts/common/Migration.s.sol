// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.s.sol";

abstract contract Migration is Script, DeployBase {
  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function __migration(
    uint256 deployerPrivateKey,
    address deployer
  ) public virtual;

  function migration() public virtual {
    uint256 pk = isAnvil()
      ? vm.envUint("LOCAL_PRIVATE_KEY")
      : vm.envUint("PRIVATE_KEY");

    address deployer = vm.addr(pk);

    info(
      string.concat(
        unicode"running migration \n\t📜 ",
        unicode"\n\t⚡️ on ",
        versionAlias(),
        unicode"\n\t📬 from deployer address"
      ),
      vm.toString(deployer)
    );

    __migration(pk, deployer);

    info(unicode"✅ ", " migration complete");
  }

  function run() public virtual {
    migration();
  }
}
