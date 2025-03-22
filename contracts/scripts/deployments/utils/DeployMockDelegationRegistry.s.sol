// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {MockDelegationRegistry} from "contracts/test/mocks/MockDelegationRegistry.sol";

contract DeployMockDelegationRegistry is Deployer {
  function versionName() public pure override returns (string memory) {
    return "utils/mockDelegationRegistry";
  }

  function __deploy(address deployer) public override returns (address) {
    // bytes32 salt = bytes32(uint256(uint160(deployer))); // create a salt from address

    // bytes32 initCodeHash = hashInitCode(type(MockERC20).creationCode);
    // address predeterminedAddress = vm.computeCreate2Address(salt, initCodeHash);

    vm.startBroadcast(deployer);
    MockDelegationRegistry deployment = new MockDelegationRegistry();
    vm.stopBroadcast();

    return address(deployment);
  }
}
