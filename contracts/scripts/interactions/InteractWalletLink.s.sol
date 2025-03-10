// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {console2} from "forge-std/console2.sol";
import {IWalletLink, IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {EIP712Facet} from "@river-build/diamond/src/utils/cryptography/signature/EIP712Facet.sol";

contract InteractWalletLink is Interaction, IWalletLinkBase {
  bytes32 private constant _LINKED_WALLET_TYPEHASH =
    0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;
  bytes32 private constant PERMIT_TYPEHASH =
    keccak256(
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );
  string public constant LINKED_WALLET_MESSAGE = "Link your external wallet";

  function __interact(address deployer) internal override {
    address spaceFactory = getDeployment("spaceFactory");

    uint256 rootPrivateKey = 0x604cb4e2953f8efd5a614053aadea52fd89b7788617bbfe507cd0e248ba086ae;

    // Get root address from private key
    address rootAddress = vm.addr(rootPrivateKey);

    uint256 nonce = IWalletLink(spaceFactory).getLatestNonceForRootKey(
      rootAddress
    );

    // Sign message with root private key
    bytes memory signature = _signWalletLink(
      spaceFactory,
      rootPrivateKey,
      deployer,
      nonce
    );

    // Create wallet link struct
    LinkedWallet memory rootWallet = LinkedWallet({
      addr: rootAddress,
      signature: signature,
      message: LINKED_WALLET_MESSAGE
    });

    // Link caller to root key
    vm.broadcast(deployer);
    IWalletLink(spaceFactory).linkCallerToRootKey(rootWallet, nonce);

    address[] memory linkedWallets = IWalletLink(spaceFactory)
      .getWalletsByRootKey(rootAddress);

    address[] memory delegatedWallets = IWalletLink(spaceFactory)
      .getWalletsByRootKeyWithDelegations(rootAddress);

    console2.log("Linked wallets:", linkedWallets.length);
    console2.log("Delegated wallets:", delegatedWallets.length);
  }

  function _signWalletLink(
    address spaceFactory,
    uint256 privateKey,
    address newWallet,
    uint256 nonce
  ) internal view returns (bytes memory) {
    bytes32 linkedWalletHash = _getLinkedWalletTypedDataHash(
      LINKED_WALLET_MESSAGE,
      newWallet,
      nonce
    );
    (uint8 v, bytes32 r, bytes32 s) = signIntent(
      privateKey,
      address(spaceFactory),
      linkedWalletHash
    );

    return abi.encodePacked(r, s, v);
  }

  function _getLinkedWalletTypedDataHash(
    string memory message,
    address addr,
    uint256 nonce
  ) internal pure returns (bytes32) {
    // https://eips.ethereum.org/EIPS/eip-712
    // ATTENTION: "The dynamic values bytes and string are encoded as a keccak256 hash of their contents."
    // in this case, the message is a string, so it is keccak256 hashed
    return
      keccak256(
        abi.encode(
          _LINKED_WALLET_TYPEHASH,
          keccak256(bytes(message)),
          addr,
          nonce
        )
      );
  }

  function signIntent(
    uint256 privateKey,
    address eip712,
    bytes32 structHash
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    bytes32 typeDataHash = MessageHashUtils.toTypedDataHash(
      EIP712Facet(eip712).DOMAIN_SEPARATOR(),
      structHash
    );
    (v, r, s) = vm.sign(privateKey, typeDataHash);
  }
}
