// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {ITokenEntitlement} from "./ITokenEntitlement.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IRoles} from "src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "../IEntitlement.sol";

contract TokenEntitlement is
    Initializable,
    ERC165Upgradeable,
    ContextUpgradeable,
    UUPSUpgradeable,
    ITokenEntitlement
{
    // keccak256(abi.encode(uint256(keccak256("spaces.entitlements.token.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0x66667ff88546bbe8cd8a256e24a6dc28862d3e12e7bd3d829a51bb68df7b2800;

    // @custom:storage-location erc7201:spaces.entitlements.token.storage
    struct Layout {
        mapping(uint256 => TokenData) tokenDataByRoleId;
        mapping(uint256 => address) grantedBy;
        mapping(uint256 => uint256) grantedTime;
    }

    address public SPACE_ADDRESS;

    string public constant name = "Token Entitlement";
    string public constant description = "Entitlement for same-chain token balance checks";
    string public constant moduleType = "TokenEntitlement";
    bool public constant isCrosschain = false;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _space) public initializer {
        __UUPSUpgradeable_init();
        __ERC165_init();
        __Context_init();
        SPACE_ADDRESS = _space;
    }

    modifier onlySpace() {
        if (_msgSender() != SPACE_ADDRESS) {
            revert TokenEntitlement__NotAllowed();
        }
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlySpace {}

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == type(IEntitlement).interfaceId ||
            interfaceId == type(ITokenEntitlement).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function isEntitled(bytes32, address[] memory users, bytes32) external view returns (bool) {
        uint256 usersLength = users.length;

        // Get all role IDs that have token data configured
        Layout storage $ = getLayout();

        IRoles.Role[] memory roles = IRoles(SPACE_ADDRESS).getRoles();

        for (uint256 i; i < roles.length; ++i) {
            uint256 roleId = roles[i].id;
            TokenData storage tokenData = $.tokenDataByRoleId[roleId];

            // Skip if no token data for this role
            if (
                tokenData.contractAddress == address(0) && tokenData.tokenType != TokenType.NATIVE
            ) {
                continue;
            }

            // Check if any user meets the token requirements
            for (uint256 j; j < usersLength; ++j) {
                if (_checkTokenBalance(users[i], tokenData)) {
                    return true;
                }
            }
        }

        return false;
    }

    function setEntitlement(uint256 roleId, bytes calldata entitlementData) external onlySpace {
        if (entitlementData.length == 0) {
            revert TokenEntitlement__InvalidTokenData();
        }

        TokenData memory tokenData = abi.decode(entitlementData, (TokenData));

        // Validate token data
        if (tokenData.tokenType > TokenType.NATIVE) {
            revert TokenEntitlement__InvalidTokenType();
        }

        if (tokenData.tokenType != TokenType.NATIVE && tokenData.contractAddress == address(0)) {
            revert TokenEntitlement__InvalidTokenData();
        }

        if (tokenData.threshold == 0) {
            revert TokenEntitlement__InvalidTokenData();
        }

        Layout storage $ = getLayout();
        $.tokenDataByRoleId[roleId] = tokenData;
        $.grantedBy[roleId] = _msgSender();
        $.grantedTime[roleId] = block.timestamp;
    }

    function removeEntitlement(uint256 roleId) external onlySpace {
        Layout storage $ = getLayout();

        if ($.grantedBy[roleId] == address(0)) {
            revert TokenEntitlement__InvalidTokenData();
        }

        delete $.tokenDataByRoleId[roleId];
        delete $.grantedBy[roleId];
        delete $.grantedTime[roleId];
    }

    function getEntitlementDataByRoleId(uint256 roleId) external view returns (bytes memory) {
        Layout storage $ = getLayout();
        TokenData storage tokenData = $.tokenDataByRoleId[roleId];

        if ($.grantedBy[roleId] == address(0)) {
            return "";
        }

        return abi.encode(tokenData);
    }

    function getTokenData(uint256 roleId) external view returns (TokenData memory) {
        return getLayout().tokenDataByRoleId[roleId];
    }

    function encodeTokenData(TokenData calldata data) external pure returns (bytes memory) {
        return abi.encode(data);
    }

    function _checkTokenBalance(
        address user,
        TokenData storage tokenData
    ) internal view returns (bool) {
        if (tokenData.tokenType == TokenType.ERC20) {
            return IERC20(tokenData.contractAddress).balanceOf(user) >= tokenData.threshold;
        } else if (tokenData.tokenType == TokenType.ERC721) {
            return IERC721(tokenData.contractAddress).balanceOf(user) >= tokenData.threshold;
        } else if (tokenData.tokenType == TokenType.ERC1155) {
            return
                IERC1155(tokenData.contractAddress).balanceOf(user, tokenData.tokenId) >=
                tokenData.threshold;
        } else if (tokenData.tokenType == TokenType.NATIVE) {
            return user.balance >= tokenData.threshold;
        }

        return false;
    }
}
