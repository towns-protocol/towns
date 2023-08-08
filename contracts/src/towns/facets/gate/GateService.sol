// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {GateStorage} from "./GateStorage.sol";

// errors
error GateFacetService__NotAllowed();

library GateService {
  using EnumerableSet for EnumerableSet.AddressSet;

  function createGate(address token, uint256 quantity) internal {
    // check if token supports ERC721 or ERC20
    if (
      !IERC165(token).supportsInterface(type(IERC721).interfaceId) &&
      !IERC165(token).supportsInterface(type(IERC20).interfaceId)
    ) {
      revert GateFacetService__NotAllowed();
    }

    if (quantity == 0) {
      revert GateFacetService__NotAllowed();
    }

    GateStorage.Layout storage ds = GateStorage.gateStorage();

    ds.tokens.add(token);
    ds.allowedTokens[token] = GateStorage.Gating({
      token: token,
      quantity: quantity
    });
  }

  function removeGate(address token) internal {
    GateStorage.Layout storage ds = GateStorage.gateStorage();
    delete ds.allowedTokens[token];
  }

  function isTokenGated(address token) internal view returns (bool) {
    GateStorage.Layout storage ds = GateStorage.gateStorage();
    return ds.allowedTokens[token].token != address(0);
  }

  function checkTokenGate(address user) internal view {
    GateStorage.Layout storage ds = GateStorage.gateStorage();

    uint256 tokensLen = ds.tokens.length();

    for (uint256 i = 0; i < tokensLen; i++) {
      address token = ds.tokens.at(i);
      GateStorage.Gating storage gating = ds.allowedTokens[token];

      if (IERC20(token).balanceOf(user) < gating.quantity) {
        revert GateFacetService__NotAllowed();
      }
    }
  }
}
