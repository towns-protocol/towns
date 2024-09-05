// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {MockERC20} from "contracts/test/mocks/MockERC20.sol";

contract DeployMockERC20 is Deployer {
  function versionName() public pure override returns (string memory) {
    return "mockERC20";
  }

  function __deploy(address deployer) public override returns (address) {
    // bytes32 salt = bytes32(uint256(uint160(deployer))); // create a salt from address

    // bytes32 initCodeHash = hashInitCode(type(MockERC20).creationCode);
    // address predeterminedAddress = vm.computeCreate2Address(salt, initCodeHash);

    vm.startBroadcast(deployer);
    MockERC20 deployment = new MockERC20("TownsTest", "TToken");
    vm.stopBroadcast();

    return address(deployment);
  }
}
