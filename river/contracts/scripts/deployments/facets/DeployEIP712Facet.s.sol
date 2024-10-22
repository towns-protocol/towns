// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {EIP712Facet} from "contracts/src/diamond/utils/cryptography/signature/EIP712Facet.sol";

contract DeployEIP712Facet is FacetHelper, Deployer {
  constructor() {
    addSelector(EIP712Facet.DOMAIN_SEPARATOR.selector);
    addSelector(EIP712Facet.nonces.selector);
    addSelector(EIP712Facet.eip712Domain.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "eip712Facet";
  }

  function initializer() public pure override returns (bytes4) {
    return EIP712Facet.__EIP712_init.selector;
  }

  function makeInitData(
    string memory name,
    string memory version
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), name, version);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    EIP712Facet facet = new EIP712Facet();
    vm.stopBroadcast();
    return address(facet);
  }
}
