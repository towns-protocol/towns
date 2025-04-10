// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IGuardian} from "src/spaces/facets/guardian/IGuardian.sol";

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {GuardianFacet} from "src/spaces/facets/guardian/GuardianFacet.sol";

contract DeployGuardianFacet is FacetHelper, Deployer {
    constructor() {
        addSelector(IGuardian.enableGuardian.selector);
        addSelector(IGuardian.guardianCooldown.selector);
        addSelector(IGuardian.disableGuardian.selector);
        addSelector(IGuardian.isGuardianEnabled.selector);
        addSelector(IGuardian.getDefaultCooldown.selector);
        addSelector(IGuardian.setDefaultCooldown.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/guardianFacet";
    }

    function initializer() public pure override returns (bytes4) {
        return GuardianFacet.__GuardianFacet_init.selector;
    }

    function makeInitData(uint256 cooldown) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), cooldown);
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        GuardianFacet facet = new GuardianFacet();
        vm.stopBroadcast();
        return address(facet);
    }
}
