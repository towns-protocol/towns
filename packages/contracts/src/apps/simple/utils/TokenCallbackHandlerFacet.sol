// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract TokenCallbackHandlerFacet is Facet {
    function __TokenCallbackHandlerFacet_init() external onlyInitializing {
        __TokenCallbackHandlerFacet_init_unchained();
    }

    function __TokenCallbackHandlerFacet_init_unchained() internal {
        _addInterface(type(IERC721Receiver).interfaceId);
        _addInterface(type(IERC1155Receiver).interfaceId);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
