// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "forge-std/Script.sol";
import {DeployBase} from "./DeployBase.s.sol";

abstract contract Upgrader is Script, DeployBase {
  function __upgrade(
    uint256 deployerPrivateKey,
    address deployer
  ) public virtual;

  function upgrade() public virtual {
    uint256 pk = block.chainid == 31337
      ? vm.envUint("LOCAL_PRIVATE_KEY")
      : vm.envUint("PRIVATE_KEY");

    __upgrade(pk, vm.addr(pk));
  }

  function run() public virtual {
    upgrade();
  }
}
