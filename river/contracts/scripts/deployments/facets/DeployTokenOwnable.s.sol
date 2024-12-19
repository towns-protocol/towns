// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {ITokenOwnableBase} from "@river-build/diamond/src/facets/ownable/token/ITokenOwnable.sol";

//libraries

//contracts
import {FacetHelper} from "@river-build/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TokenOwnableFacet} from "@river-build/diamond/src/facets/ownable/token/TokenOwnableFacet.sol";

contract DeployTokenOwnable is FacetHelper, Deployer, ITokenOwnableBase {
  constructor() {
    addSelector(TokenOwnableFacet.owner.selector);
    addSelector(TokenOwnableFacet.transferOwnership.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "tokenOwnableFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    TokenOwnableFacet facet = new TokenOwnableFacet();
    vm.stopBroadcast();
    return address(facet);
  }

  function initializer() public pure override returns (bytes4) {
    return TokenOwnableFacet.__TokenOwnable_init.selector;
  }

  function makeInitData(
    TokenOwnable memory tokenOwnable
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        TokenOwnableFacet.__TokenOwnable_init.selector,
        tokenOwnable
      );
  }
}
