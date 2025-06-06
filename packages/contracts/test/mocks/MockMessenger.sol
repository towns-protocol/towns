// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

contract MockMessenger {
    address internal sender;

    function xDomainMessageSender() external view returns (address) {
        return sender;
    }

    function setXDomainMessageSender(address sender_) external {
        sender = sender_;
    }

    function sendMessage(address target, bytes calldata message, uint32 minGasLimit) external {
        sender = msg.sender;

        (bool success, ) = target.call{gas: minGasLimit}(message);
        if (!success) {
            revert("MockMessenger: failed to send message");
        }
    }
}
