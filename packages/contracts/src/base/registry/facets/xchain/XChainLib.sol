// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "../../../../spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementChecker} from "../checker/IEntitlementChecker.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library XChainLib {
    struct Check {
        EnumerableSet.UintSet requestIds;
        mapping(uint256 requestId => EnumerableSet.AddressSet) nodes;
        mapping(uint256 requestId => IEntitlementGatedBase.NodeVote[]) votes;
        mapping(uint256 requestId => bool voteCompleted) voteCompleted;
    }

    /// @dev Stores crosschain entitlement check request data
    /// @param value Amount escrowed (ETH or ERC20)
    /// @param blockNumber Block when request was created
    /// @param caller Space contract that initiated the request
    /// @param completed Whether the request has been finalized
    /// @param receiver Wallet address being checked for entitlement
    /// @param currency Token address (NATIVE_TOKEN for ETH)
    struct Request {
        uint256 value;
        uint256 blockNumber;
        address caller;
        bool completed;
        address receiver;
        address currency;
    }

    struct Layout {
        IEntitlementChecker entitlementChecker;
        mapping(address => EnumerableSet.Bytes32Set) requestsBySender;
        mapping(bytes32 => Request) requests;
        mapping(bytes32 => Check) checks;
    }

    // keccak256(abi.encode(uint256(keccak256("xchain.entitlement.transactions.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xf501c51c066c21fd640901535874a71171bb35113f6dc2832fce1b1f9da0cc00;

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
