// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPioneerBase} from "./IPioneer.sol";

// libraries
import {PioneerStorage} from "./PioneerStorage.sol";

// contracts

contract PioneerBase is IPioneerBase {
  // =============================================================
  //                           Allowed
  // =============================================================
  function _setAllowed(address user, bool allow) internal {
    if (user == address(0)) revert NotAllowed();
    if (_isAllowed(user) == allow) revert AlreadyAllowed();
    PioneerStorage.layout().allowed[user] = allow;
  }

  function _isAllowed(address user) internal view returns (bool) {
    return PioneerStorage.layout().allowed[user];
  }

  // =============================================================
  //                           Base URI
  // =============================================================
  function _setBaseURI(string memory baseURI) internal {
    if (bytes(baseURI).length == 0) revert NonExistentTokenURI();
    PioneerStorage.layout().baseUri = baseURI;
  }

  function _getBaseURI() internal view returns (string memory) {
    return PioneerStorage.layout().baseUri;
  }

  // =============================================================
  //                           Minting
  // =============================================================
  function _setMintReward(uint256 mintReward) internal {
    if (mintReward == 0) revert InvalidRewardValue();
    PioneerStorage.layout().mintReward = mintReward;
  }

  function _getMintReward() internal view returns (uint256) {
    return PioneerStorage.layout().mintReward;
  }

  function _sendReward(address to, uint256 amount) internal {
    (bool success, ) = to.call{value: amount}("");
    require(success, "PioneerBase: failed to send reward");
  }
}
