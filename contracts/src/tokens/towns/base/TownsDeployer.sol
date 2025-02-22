// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Create2Utils} from "contracts/src/utils/Create2Utils.sol";

// contracts
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

contract TownsDeployer {
  constructor(
    address l1Token,
    address owner,
    bytes32 implementationSalt,
    bytes32 proxySalt
  ) {
    address implementation = Create2Utils.create2Deploy(
      implementationSalt,
      type(Towns).creationCode
    );

    // Create proxy initialization bytecode
    bytes memory proxyBytecode = abi.encodePacked(
      type(ERC1967Proxy).creationCode,
      abi.encode(
        implementation,
        abi.encodePacked(Towns.initialize.selector, abi.encode(l1Token, owner))
      )
    );

    // Deploy proxy using create2
    Create2Utils.create2Deploy(proxySalt, proxyBytecode);
  }
}
