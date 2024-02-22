// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IRiverBase} from "contracts/src/tokens/river/mainnet/IRiver.sol";

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";

contract DeployRiverBase is Deployer, IRiverBase {
  // address public bridgeSepolia = 0x4200000000000000000000000000000000000007;
  // address public bridgeMainnet = 0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1;

  address public bridgeBase = 0x4200000000000000000000000000000000000010;
  address public l1Token = 0xF438EB225e07914c6812224551156267Baf13813; // this is a random wallet address, replace with the actual address that will be deployed to mainnet
  address public architect;
  address public operator;

  address internal l2Token;

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
