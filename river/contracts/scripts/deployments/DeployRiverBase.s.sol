// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IRiverBase} from "contracts/src/tokens/river/mainnet/IRiver.sol";

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";

contract DeployRiverBase is Deployer, IRiverBase {
  address public bridgeBase = 0x4200000000000000000000000000000000000010;
  address public l1Token = 0x40eF1bb984503bb5Adef041A88a4F9180e8586f9; // sepolia

  function versionName() public pure override returns (string memory) {
    return "river";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new River({_bridge: bridgeBase, _remoteToken: l1Token}));
  }
}
