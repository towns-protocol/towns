// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "../../factory/facets/wallet-link/IWalletLink.sol";
import {IEntitlement} from "../entitlements/IEntitlement.sol";
import {IEntitlementBase} from "../entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ERC721ABase} from "../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {EntitlementsManagerStorage} from "./entitlements/EntitlementsManagerStorage.sol";
import {MembershipStorage} from "./membership/MembershipStorage.sol";

// contracts
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {BanningBase} from "./banning/BanningBase.sol";

abstract contract Entitled is
    IEntitlementBase,
    TokenOwnableBase,
    PausableBase,
    BanningBase,
    ERC721ABase
{
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 internal constant IN_TOWN = 0x0;

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
        address owner = _owner();

        address[] memory wallets = _getLinkedWalletsWithUser(user);
        uint256 linkedWalletsLength = wallets.length;

        uint256[] memory bannedTokens = _bannedTokenIds();
        uint256 bannedTokensLen = bannedTokens.length;

        for (uint256 i; i < linkedWalletsLength; ++i) {
            address wallet = wallets[i];

            if (wallet == owner) {
                return true;
            }

            // check if banned
            for (uint256 j; j < bannedTokensLen; ++j) {
                if (_ownerOf(bannedTokens[j]) == wallet) {
                    return false;
                }
            }
        }

        // Entitlement checks for members
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();
        uint256 entitlementsLength = ds.entitlements.length();

        for (uint256 i; i < entitlementsLength; ++i) {
            IEntitlement entitlement = ds.entitlementByAddress[ds.entitlements.at(i)].entitlement;
            if (
                !entitlement.isCrosschain() &&
                entitlement.isEntitled(channelId, wallets, permission)
            ) {
                return true;
            }
        }

        return false;
    }

    function _validatePermission(string memory permission) internal view {
        if (_owner() == msg.sender || (!_paused() && _isEntitledToSpace(msg.sender, permission)))
            return;

        CustomRevert.revertWith(Entitlement__NotAllowed.selector);
    }

    function _isMember(address user) internal view returns (bool member) {
        member = _balanceOf(user) > 0;
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
            if (_isMember(wallets[i]) || wallets[i] == owner) {
                return;
            }
        }
        CustomRevert.revertWith(Entitlement__NotMember.selector);
    }

    function _getLinkedWalletsWithUser(address rootKey) internal view returns (address[] memory) {
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

        uint256 linkedWalletsLength = linkedWallets.length;

        address[] memory wallets = new address[](linkedWalletsLength + 1);
        for (uint256 i; i < linkedWalletsLength; ++i) {
            wallets[i] = linkedWallets[i];
        }
        wallets[linkedWalletsLength] = rootKey;
        return wallets;
    }
}
