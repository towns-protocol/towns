// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {TokenMigrationFacet} from "src/tokens/migration/TokenMigrationFacet.sol";

library DeployTokenMigration {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](3);
        res[0] = TokenMigrationFacet.migrate.selector;
        res[1] = TokenMigrationFacet.emergencyWithdraw.selector;
        res[2] = TokenMigrationFacet.tokens.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(address oldToken, address newToken) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                TokenMigrationFacet.__TokenMigrationFacet_init,
                (IERC20(oldToken), IERC20(newToken))
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("TokenMigrationFacet.sol", "");
    }
}
