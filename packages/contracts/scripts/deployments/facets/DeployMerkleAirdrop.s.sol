// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

// contracts
import {MerkleAirdrop} from "src/utils/airdrop/merkle/MerkleAirdrop.sol";

library DeployMerkleAirdrop {
    function selectors() internal pure returns (bytes4[] memory res) {
        res = new bytes4[](4);
        res[0] = MerkleAirdrop.claim.selector;
        res[1] = MerkleAirdrop.getMerkleRoot.selector;
        res[2] = MerkleAirdrop.getToken.selector;
        res[3] = MerkleAirdrop.getMessageHash.selector;
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(bytes32 merkleRoot, address token) internal pure returns (bytes memory) {
        return abi.encodeCall(MerkleAirdrop.__MerkleAirdrop_init, (merkleRoot, IERC20(token)));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MerkleAirdrop.sol", "");
    }
}
