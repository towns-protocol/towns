// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {ERC2771RecipientSetup} from "./ERC2771RecipientSetup.sol";
import {MinimalForwarder} from "openzeppelin-contracts/contracts/metatx/MinimalForwarder.sol";

contract ERC2771RecipientTest is ERC2771RecipientSetup {
  function test_isTrustedForwarder() external {
    assertTrue(recipient.isTrustedForwarder(address(forwarder)));
  }

  function test_forward_request() public {
    // Let's create some random user
    uint256 userPrivKey = _randomUint256();
    address user = vm.addr(userPrivKey);

    // Create relayer address (in a real scenario this would be the address from OZ or GSN)
    address relayer = _randomAddress();

    // Create a Forwarder request, in a real scenario this would be made by the client
    MinimalForwarder.ForwardRequest memory request = MinimalForwarder
      .ForwardRequest({
        // who's the original caller
        from: user,
        // where we want the execution to happen
        to: address(recipient),
        value: 0,
        gas: 100_000,
        nonce: MinimalForwarder(forwarder).getNonce(user),
        // the actual data to be executed on the recipient
        data: abi.encodeCall(recipient.callGasless, ())
      });

    // Sign the request
    bytes memory signature = signForwarderRequest(request, userPrivKey);

    // Execute the request as the relayer
    vm.prank(relayer);
    (bool success, ) = MinimalForwarder(forwarder).execute(request, signature);

    assertTrue(success);
    assertEq(recipient.getCaller(), user);
  }
}
