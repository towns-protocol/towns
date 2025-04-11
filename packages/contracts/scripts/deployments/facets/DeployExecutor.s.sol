// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
//libraries
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {Executor} from "src/spaces/facets/account/Executor.sol";

library DeployExecutor {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](15);
        _selectors[0] = Executor.grantAccess.selector;
        _selectors[1] = Executor.hasAccess.selector;
        _selectors[2] = Executor.revokeAccess.selector;
        _selectors[3] = Executor.renounceAccess.selector;
        _selectors[4] = Executor.setGuardian.selector;
        _selectors[5] = Executor.setGroupDelay.selector;
        _selectors[6] = Executor.getGroupDelay.selector;
        _selectors[7] = Executor.getAccess.selector;
        _selectors[8] = Executor.setTargetFunctionGroup.selector;
        _selectors[9] = Executor.setTargetDisabled.selector;
        _selectors[10] = Executor.getSchedule.selector;
        _selectors[11] = Executor.scheduleOperation.selector;
        _selectors[12] = Executor.hashOperation.selector;
        _selectors[13] = Executor.execute.selector;
        _selectors[14] = Executor.cancel.selector;
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
        return DeployLib.deployCode("Executor.sol", "");
    }
}
