// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC2771Recipient} from "./IERC2771Recipient.sol";

// libraries
import {ERC2771RecipientStorage} from "./ERC2771RecipientStorage.sol";

// contracts

abstract contract ERC2771RecipientBase is IERC2771Recipient {
  function __ERC2771RecipientBase_init(address trustedForwarder) internal {
    ERC2771RecipientStorage.layout().trustedForwarders[trustedForwarder] = true;
  }

  // =============================================================
  //                           External
  // =============================================================
  function isTrustedForwarder(
    address forwarder
  ) public view override returns (bool) {
    return ERC2771RecipientStorage.layout().trustedForwarders[forwarder];
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _msgSender() internal view returns (address sender) {
    if (msg.data.length >= 20 && isTrustedForwarder(msg.sender)) {
      // At this point we know that the sender is a trusted forwarder,
      // so we trust that the last bytes of msg.data are the verified sender address.
      // extract sender address from the end of msg.data
      assembly {
        sender := shr(96, calldataload(sub(calldatasize(), 20)))
      }
    } else {
      return msg.sender;
    }
  }

  function _msgData() internal view returns (bytes calldata) {
    if (msg.data.length >= 20 && isTrustedForwarder(msg.sender)) {
      return msg.data[0:msg.data.length - 20];
    } else {
      return msg.data;
    }
  }

  function _setTrustedForwarder(address forwarder, bool trusted) internal {
    ERC2771RecipientStorage.layout().trustedForwarders[forwarder] = trusted;
  }
}
