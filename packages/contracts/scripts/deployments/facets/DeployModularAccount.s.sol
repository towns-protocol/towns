// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

// contracts
import {ModularAccount} from "src/spaces/facets/account/ModularAccount.sol";

library DeployModularAccount {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](6);
        _selectors[0] = ModularAccount.execute.selector;
        _selectors[1] = ModularAccount.installModule.selector;
        _selectors[2] = ModularAccount.uninstallModule.selector;
        _selectors[3] = ModularAccount.isModuleEntitled.selector;
        _selectors[4] = ModularAccount.setModuleAllowance.selector;
        _selectors[5] = ModularAccount.getModuleAllowance.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return
            IDiamond.FacetCut({
                action: action,
                facetAddress: facetAddress,
                functionSelectors: selectors()
            });
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("ModularAccount.sol", "");
    }
}
