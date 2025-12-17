// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// contracts
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {AccountTippingFacet} from "src/account/facets/tipping/AccountTippingFacet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployAccountTippingFacet {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(8);

        arr.p(AccountTippingFacet.sendTip.selector);
        arr.p(AccountTippingFacet.tip.selector);
        arr.p(AccountTippingFacet.tipsByWalletAndCurrency.selector);
        arr.p(AccountTippingFacet.tipCountByWalletAndCurrency.selector);
        arr.p(AccountTippingFacet.tipsByCurrencyAndTokenId.selector);
        arr.p(AccountTippingFacet.tippingCurrencies.selector);
        arr.p(AccountTippingFacet.totalTipsByCurrency.selector);
        arr.p(AccountTippingFacet.tipAmountByCurrency.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData() internal pure returns (bytes memory) {
        return abi.encodeCall(AccountTippingFacet.__AccountTippingFacet_init, ());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("AccountTippingFacet.sol", "");
    }
}
