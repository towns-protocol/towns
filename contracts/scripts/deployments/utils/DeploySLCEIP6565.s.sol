// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {SCL_EIP6565} from "crypto-lib/lib/libSCL_EIP6565.sol";

contract DeploySLCEIP6565 is Deployer {
  function versionName() public pure override returns (string memory) {
    return "utils/sclEip6565";
  }

  function __deploy(
    address deployer
  ) public override returns (address) {
    address verifierLib;
    bytes memory bytecode = abi.encodePacked(type(SCL_EIP6565).creationCode);

    // Libraries are deployed differently in Foundry
    vm.startBroadcast(deployer);
    assembly {
      verifierLib := create(0, add(bytecode, 0x20), mload(bytecode))
    }
    vm.stopBroadcast();
    require(verifierLib != address(0), "Failed to deploy SCL_EIP6565 library");
    return verifierLib;
  }
}
