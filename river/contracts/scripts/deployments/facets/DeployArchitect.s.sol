// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployArchitect is FacetHelper, Deployer {
  constructor() {
    addSelector(IArchitect.getSpaceByTokenId.selector);
    addSelector(IArchitect.getTokenIdBySpace.selector);
    addSelector(IArchitect.setSpaceArchitectImplementations.selector);
    addSelector(IArchitect.getSpaceArchitectImplementations.selector);
    addSelector(IArchitect.setProxyInitializer.selector);
    addSelector(IArchitect.getProxyInitializer.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return Architect.__Architect_init.selector;
  }

  function makeInitData(
    address _spaceOwnerToken,
    address _userEntitlement,
    address _ruleEntitlement,
    address _legacyRuleEntitlement
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        initializer(),
        _spaceOwnerToken,
        _userEntitlement,
        _ruleEntitlement,
        _legacyRuleEntitlement
      );
  }

  function versionName() public pure override returns (string memory) {
    return "architectFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    Architect architect = new Architect();
    vm.stopBroadcast();
    return address(architect);
  }
}
