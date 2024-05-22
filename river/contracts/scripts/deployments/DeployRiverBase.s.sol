// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces
import {IRiverBase} from "contracts/src/tokens/river/mainnet/IRiver.sol";

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";

contract DeployRiverBase is Deployer, IRiverBase {
  address public bridgeBase = 0x4200000000000000000000000000000000000010; // L2StandardBridge
  address public l1Token;

  function versionName() public pure override returns (string memory) {
    return "river";
  }

  function __deploy(address deployer) public override returns (address) {
    l1Token = _getToken();

    vm.broadcast(deployer);
    return address(new River({_bridge: bridgeBase, _remoteToken: l1Token}));
  }

  function _getToken() internal view returns (address) {
    if (block.chainid == 8453) {
      // if deploying to base use mainnet token
      return 0x53319181e003E7f86fB79f794649a2aB680Db244;
    } else if (block.chainid == 84532) {
      // if deploying to base-sepolia use sepolia token
      return 0x40eF1bb984503bb5Adef041A88a4F9180e8586f9;
    } else {
      return 0x40eF1bb984503bb5Adef041A88a4F9180e8586f9;
    }
  }
}
