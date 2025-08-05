// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "../../factory/facets/wallet-link/IWalletLink.sol";
import {IEntitlement, IEntitlementBase} from "../entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {PausableStorage} from "@towns-protocol/diamond/src/facets/pausable/PausableStorage.sol";
import {LibSort} from "solady/utils/LibSort.sol";
import {ERC721AStorage} from "../../diamond/facets/token/ERC721A/ERC721AStorage.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {EntitlementsManagerStorage} from "./entitlements/EntitlementsManagerStorage.sol";
import {MembershipStorage} from "./membership/MembershipStorage.sol";
import {BanningStorage} from "./banning/BanningStorage.sol";
import {AppAccountStorage} from "./account/AppAccountStorage.sol";
import {DependencyLib} from "./DependencyLib.sol";

// contracts
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

abstract contract Entitled is IEntitlementBase, TokenOwnableBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using CustomRevert for bytes4;

    bytes32 internal constant IN_TOWN = 0x0;
    uint256 internal constant MEMBERSHIP_START_TOKEN_ID = 0;

    function _isEntitledToSpace(
        address user,
        string memory permission
    ) internal view returns (bool) {
        return _isEntitledToChannel(IN_TOWN, user, bytes32(bytes(permission)));
    }

    function _isEntitledToChannel(
        bytes32 channelId,
        address user,
        bytes32 permission
    ) internal view returns (bool) {
        address[] memory wallets = _getLinkedWalletsWithUser(user);
        if (wallets.length == 0) return false;

        // Check owner first (cheapest check)
        address owner = _owner();
        for (uint256 i; i < wallets.length; ++i) if (wallets[i] == owner) return true;

        // Check if any wallet is banned using optimized O(n log n + m) approach
        if (_hasAnyBannedWallet(wallets)) return false;

        // Entitlement checks for members
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();
        address[] memory entitlements = ds.entitlements.values();
        uint256 entitlementsLength = entitlements.length;

        for (uint256 i; i < entitlementsLength; ++i) {
            IEntitlement entitlement = ds.entitlementByAddress[entitlements[i]].entitlement;
            if (
                !entitlement.isCrosschain() &&
                entitlement.isEntitled(channelId, wallets, permission)
            ) return true;
        }

        return false;
    }

    function _validatePermission(string memory permission) internal view {
        // Owner always has permission
        if (_owner() == msg.sender) return;

        // Check if not paused and user has permission
        if (!PausableStorage.layout().paused) {
            bytes32 permissionHash = bytes32(bytes(permission));

            // Check space entitlements
            if (_isEntitledToSpace(msg.sender, permission)) return;

            // Check bot entitlements
            if (_isBotEntitled(msg.sender, permissionHash)) return;
        }

        Entitlement__NotAllowed.selector.revertWith();
    }

    function _isMember(address user) internal view returns (bool member) {
        member = ERC721AStorage.balanceOf(user) > 0;
    }

    function _validateMembership(address user) internal view {
        // return if the user is a member or the owner
        if (_isMember(user)) return;
        address owner = _owner();
        if (user == owner) return;

        // otherwise, check if the user is a linked wallet
        address[] memory wallets = _getLinkedWalletsWithUser(user);
        uint256 length = wallets.length;
        for (uint256 i; i < length; ++i) {
            if (_isMember(wallets[i]) || wallets[i] == owner) return;
        }
        Entitlement__NotMember.selector.revertWith();
    }

    function _getLinkedWalletsWithUser(
        address rootKey
    ) internal view returns (address[] memory wallets) {
        IWalletLink wl = IWalletLink(MembershipStorage.layout().spaceFactory);
        address[] memory linkedWallets = wl.getWalletsByRootKey(rootKey);

        // Allow for the possibility that the user is not a root key, but a linked wallet.
        if (linkedWallets.length == 0) {
            address alternateRootKey = wl.getRootKeyForWallet(rootKey);
            if (alternateRootKey != address(0)) {
                rootKey = alternateRootKey;
                linkedWallets = wl.getWalletsByRootKey(rootKey);
            }
        }

        wallets = LibSort.copy(linkedWallets);
        assembly ("memory-safe") {
            // Increment the size of the array by 1 and add the root key
            mstore(wallets, add(mload(wallets), 1))
            // LibSort.copy assigns the free memory pointer to the end of the array
            mstore(mload(0x40), rootKey)
            mstore(0x40, add(mload(0x40), 0x20))
        }
    }

    function _isBotEntitled(address client, bytes32 permission) internal view returns (bool) {
        // Early return if client is zero address
        if (client == address(0)) return false;

        address app = DependencyLib.getAppRegistry().getAppByClient(client);
        if (app == address(0)) return false;

        return AppAccountStorage.isAppEntitled(app, client, permission);
    }

    function _hasAnyBannedWallet(address[] memory wallets) internal view returns (bool) {
        BanningStorage.Layout storage ds = BanningStorage.layout();
        uint256[] memory bannedTokens = ds.bannedIds.values();

        if (bannedTokens.length == 0) return false;

        // Step 1: Collect banned token owners - O(n)
        address[] memory bannedOwners = new address[](bannedTokens.length);
        for (uint256 i; i < bannedTokens.length; ++i) {
            bannedOwners[i] = ERC721AStorage.ownerAt(MEMBERSHIP_START_TOKEN_ID, bannedTokens[i]);
        }

        // Step 2: Sort and deduplicate banned owners - O(n log n)
        LibSort.sort(bannedOwners);
        LibSort.uniquifySorted(bannedOwners);

        unchecked {
            // Step 3: Combine wallets with unique banned owners - O(m + n)
            address[] memory combined = new address[](wallets.length + bannedOwners.length);
            for (uint256 i; i < wallets.length; ++i) {
                combined[i] = wallets[i];
            }
            for (uint256 i; i < bannedOwners.length; ++i) {
                combined[wallets.length + i] = bannedOwners[i];
            }

            // Step 4: Check for duplicates - O(m + n)
            // any duplicate found is an intersection between wallets and banned owners
            return LibSort.hasDuplicate(combined);
        }
    }
}
