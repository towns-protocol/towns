// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployTownsBase is Deployer {
  address public bridgeBase; // L2StandardBridge
  address public l1Token;

  function versionName() public pure override returns (string memory) {
    return "towns";
  }

  function __deploy(address deployer) public override returns (address) {
    l1Token = _getToken();
    bridgeBase = _getBridge(deployer);

    vm.startBroadcast(deployer);
    address implementation = address(
      new Towns({_bridge: bridgeBase, _remoteToken: l1Token})
    );

    address proxy = address(
      new ERC1967Proxy(
        implementation,
        abi.encodeCall(Towns.initialize, deployer)
      )
    );

    vm.stopBroadcast();

    return proxy;
  }

  function _getBridge(address deployer) internal view returns (address) {
    if (block.chainid == 31337 || block.chainid == 31338) {
      return deployer;
    } else {
      return 0x4200000000000000000000000000000000000010;
    }
  }

  function _getToken() internal view returns (address) {
    if (block.chainid == 8453) {
      // if deploying to base use mainnet token
      return address(0);
    } else if (block.chainid == 84532) {
      // if deploying to base-sepolia use sepolia token
      return 0xfc85ff424F1b55fB3f9e920A47EC7255488C3bA3;
    } else if (block.chainid == 31337 || block.chainid == 31338) {
      // if deploying to base-sepolia use sepolia token
      return 0xfc85ff424F1b55fB3f9e920A47EC7255488C3bA3;
    } else {
      revert("Invalid chain");
    }
  }
}
