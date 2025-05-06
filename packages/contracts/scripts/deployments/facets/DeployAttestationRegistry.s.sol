// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

//libraries

//contracts
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";
import {AttestationRegistry} from "src/modules/reference/AttestationRegistry.sol";

library DeployAttestationRegistry {
    function selectors() internal pure returns (bytes4[] memory _selectors) {
        _selectors = new bytes4[](3);
        _selectors[0] = AttestationRegistry.attest.selector;
        _selectors[1] = AttestationRegistry.revoke.selector;
        _selectors[2] = AttestationRegistry.getAttestation.selector;
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

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(AttestationRegistry.__AttestationRegistry_init, ());
    }

    function deploy() internal returns (address) {
        return DeployLib.deployCode("AttestationRegistry.sol", "");
    }
}
