// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {Architect} from "src/factory/facets/architect/Architect.sol";

library DeployArchitect {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](6);
        _selectors[0] = IArchitect.getSpaceByTokenId.selector;
        _selectors[1] = IArchitect.getTokenIdBySpace.selector;
        _selectors[2] = IArchitect.setSpaceArchitectImplementations.selector;
        _selectors[3] = IArchitect.getSpaceArchitectImplementations.selector;
        _selectors[4] = IArchitect.setProxyInitializer.selector;
        _selectors[5] = IArchitect.getProxyInitializer.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(
        address _spaceOwnerToken,
        address _userEntitlement,
        address _ruleEntitlement,
        address _legacyRuleEntitlement
    ) internal pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                Architect.__Architect_init.selector,
                _spaceOwnerToken,
                _userEntitlement,
                _ruleEntitlement,
                _legacyRuleEntitlement
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("Architect.sol", "");
    }
}
