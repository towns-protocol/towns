// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {WalletLink} from "src/factory/facets/wallet-link/WalletLink.sol";

library DeployWalletLink {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(16);
        arr.p(WalletLink.linkCallerToRootKey.selector);
        arr.p(WalletLink.linkWalletToRootKey.selector);
        arr.p(WalletLink.removeLink.selector);
        arr.p(WalletLink.getWalletsByRootKey.selector);
        arr.p(WalletLink.getRootKeyForWallet.selector);
        arr.p(WalletLink.checkIfLinked.selector);
        arr.p(WalletLink.getLatestNonceForRootKey.selector);
        arr.p(WalletLink.removeCallerLink.selector);
        arr.p(WalletLink.setDefaultWallet.selector);
        arr.p(WalletLink.getDefaultWallet.selector);
        arr.p(WalletLink.getDependency.selector);
        arr.p(WalletLink.setDependency.selector);
        arr.p(WalletLink.getAllWalletsByRootKey.selector);
        arr.p(WalletLink.linkNonEVMWalletToRootKey.selector);
        arr.p(WalletLink.removeNonEVMWalletLink.selector);
        arr.p(WalletLink.checkIfNonEVMWalletLinked.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address sclEip6565) internal pure returns (bytes memory) {
        return abi.encodeCall(WalletLink.__WalletLink_init, (sclEip6565));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("WalletLink.sol", "");
    }
}
