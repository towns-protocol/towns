// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsPoints} from "../../../airdrop/points/ITownsPoints.sol";
import {IImplementationRegistry} from "../../../factory/facets/registry/IImplementationRegistry.sol";

// libraries
import {MembershipStorage} from "../membership/MembershipStorage.sol";

// contracts

/// @notice Base contract for interacting with the TownsPoints contract
abstract contract PointsBase {
    /// @dev The implementation ID for the TownsPoints contract
    bytes32 internal constant AIRDROP_DIAMOND = bytes32("RiverAirdrop");

    function _mintPoints(address airdropDiamond, address to, uint256 amount) internal {
        ITownsPoints(airdropDiamond).mint(to, amount);
    }

    function _getAirdropDiamond() internal view returns (address) {
        return
            IImplementationRegistry(MembershipStorage.layout().spaceFactory)
                .getLatestImplementation(AIRDROP_DIAMOND);
    }

    function _getPoints(
        address airdropDiamond,
        ITownsPoints.Action action,
        bytes memory data
    ) internal view returns (uint256) {
        return ITownsPoints(airdropDiamond).getPoints(action, data);
    }
}
