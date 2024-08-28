// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MockERC1155} from "contracts/test/mocks/MockERC1155.sol";

contract DeployMockERC1155 is Deployer {
  function versionName() public pure override returns (string memory) {
    return "mockERC1155";
  }

  function __deploy(address deployer) public override returns (address) {
    bytes32 salt = bytes32(uint256(uint160(deployer))); // create a salt from address

    bytes32 initCodeHash = hashInitCode(type(MockERC1155).creationCode);
    address predeterminedAddress = vm.computeCreate2Address(salt, initCodeHash);

    vm.startBroadcast(deployer);
    MockERC1155 deployment = new MockERC1155{salt: salt}();
    vm.stopBroadcast();

    require(predeterminedAddress == address(deployment));

    return address(deployment);
  }
}
