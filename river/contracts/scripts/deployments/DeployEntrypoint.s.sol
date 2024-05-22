// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";

contract DeployEntrypoint is Deployer {
  function versionName() public pure override returns (string memory) {
    return "entrypoint";
  }

  function __deploy(address deployer) public override returns (address) {
    if (!isAnvil()) revert("not supported");

    bytes32 salt = bytes32(uint256(1));
    bytes32 initCodeHash = hashInitCode(type(EntryPoint).creationCode);
    address soonToBe = computeCreate2Address(salt, initCodeHash);
    vm.broadcast(deployer);
    EntryPoint entrypoint = new EntryPoint{salt: salt}();
    require(address(entrypoint) == soonToBe, "address mismatch");
    return address(entrypoint);
  }
}
