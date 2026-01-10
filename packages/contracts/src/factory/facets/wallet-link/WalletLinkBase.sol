// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {ISCL_EIP6565} from "./interfaces/ISCL_EIP6565.sol";
import {LibString} from "solady/utils/LibString.sol";
import {WalletLib} from "./libraries/WalletLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {SolanaUtils} from "./libraries/SolanaUtils.sol";

// contracts
import {Nonces} from "@towns-protocol/diamond/src/utils/Nonces.sol";
import {EIP712Base} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Base.sol";

abstract contract WalletLinkBase is IWalletLinkBase, EIP712Base, Nonces {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Constants
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /// @dev `keccak256("LinkedWallet(string message,address userID,uint256 nonce)")`.
    // https://eips.ethereum.org/EIPS/eip-712
    bytes32 private constant _LINKED_WALLET_TYPEHASH =
        0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;

    /// @dev Maximum number of linked wallets per root key
    uint256 internal constant MAX_LINKED_WALLETS = 10;

    /// @dev Dependency name of SCL_EIP6565 verifier library
    bytes32 internal constant SCL_EIP6565 = bytes32("SCL_EIP6565");

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      External - Write
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

    /// @dev Links a caller address to a root wallet
    /// @param rootWallet the root wallet that the caller is linking to
    /// @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
    function _linkCallerToRootWallet(LinkedWallet calldata rootWallet, uint256 nonce) internal {
        WalletLib.Layout storage ds = WalletLib.layout();

        // The caller is the wallet that is being linked to the root wallet
        address newWallet = msg.sender;

        _verifyWallets(ds, newWallet, rootWallet.addr);

        bytes32 structHash = _getLinkedWalletTypedDataHash(rootWallet.message, newWallet, nonce);

        //Verify that the root wallet signature contains the correct nonce and the correct caller wallet
        bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

        // Verify the signature of the root wallet is correct for the nonce and wallet address
        if (ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr) {
            revert WalletLink__InvalidSignature();
        }

        //Check that the nonce being used is higher than the last nonce used
        _useCheckedNonce(rootWallet.addr, nonce);

        //set link in mapping
        ds.walletsByRootKey[rootWallet.addr].add(newWallet);
        ds.rootKeyByWallet[newWallet] = rootWallet.addr;

        emit LinkWalletToRootKey(newWallet, rootWallet.addr);
    }

    /// @dev Links a wallet to a root wallet
    /// @param wallet the wallet that is being linked to the root wallet
    /// @param rootWallet the root wallet that the wallet is linking to
    /// @param nonce The root wallet's nonce used to prevent replay attacks, nonce must always be higher than previous nonce
    /// @dev Links a wallet to a root wallet by verifying both the wallet's signature and root wallet's signature.
    /// The wallet signs a message containing the root wallet's address and nonce, while the root wallet signs a message
    /// containing the wallet's address and nonce. Both signatures must be valid for the link to be created.
    function _linkWalletToRootWallet(
        LinkedWallet calldata wallet,
        LinkedWallet calldata rootWallet,
        uint256 nonce
    ) internal {
        WalletLib.Layout storage ds = WalletLib.layout();

        _verifyWallets(ds, wallet.addr, rootWallet.addr);

        bytes32 structHash = _getLinkedWalletTypedDataHash(wallet.message, wallet.addr, nonce);

        //Verify that the root wallet signature contains the correct nonce and the correct wallet
        bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

        // Verify the signature of the root wallet is correct for the nonce and wallet address
        if (ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr) {
            revert WalletLink__InvalidSignature();
        }

        structHash = _getLinkedWalletTypedDataHash(rootWallet.message, rootWallet.addr, nonce);
        bytes32 walletMessageHash = _hashTypedDataV4(structHash);

        // Verify the signature of the wallet is correct for the nonce and root wallet address
        if (ECDSA.recover(walletMessageHash, wallet.signature) != wallet.addr) {
            revert WalletLink__InvalidSignature();
        }

        //Check that the nonce being used is higher than the last nonce used
        _useCheckedNonce(rootWallet.addr, nonce);

        //set link in mapping
        ds.walletsByRootKey[rootWallet.addr].add(wallet.addr);
        ds.rootKeyByWallet[wallet.addr] = rootWallet.addr;

        emit LinkWalletToRootKey(wallet.addr, rootWallet.addr);
    }

    function _linkNonEVMWalletToRootWalletViaCaller(
        NonEVMLinkedWallet calldata nonEVMWallet,
        uint256 nonce
    ) internal {
        WalletLib.Layout storage ds = WalletLib.layout();
        address linkedWallet = msg.sender;
        bytes32 walletHash = keccak256(abi.encode(nonEVMWallet.wallet));

        _validateNonEVMWalletInputs(ds, nonEVMWallet, walletHash);

        address rootKey = ds.rootKeyByWallet[linkedWallet];

        EnumerableSet.Bytes32Set storage walletHashes = ds
            .rootWalletByRootKey[rootKey]
            .walletHashes;

        if (walletHashes.contains(walletHash)) {
            revert WalletLink__NonEVMWalletAlreadyLinked(nonEVMWallet.wallet.addr, rootKey);
        }

        // Check that we haven't reached the maximum number of linked wallets
        if (walletHashes.length() >= MAX_LINKED_WALLETS) {
            revert WalletLink__MaxLinkedWalletsReached();
        }

        if (nonEVMWallet.wallet.vmType == WalletLib.VirtualMachineType.SVM) {
            _validateAddressFormatByVMType(nonEVMWallet.wallet);
            _verifySolanaWallet(nonEVMWallet);
        } else {
            CustomRevert.revertWith(IWalletLinkBase.WalletLink__UnsupportedVMType.selector);
        }

        ds.rootKeyByHash[walletHash] = rootKey;
        walletHashes.add(walletHash);
        ds.rootWalletByRootKey[rootKey].walletByHash[walletHash] = nonEVMWallet.wallet;

        _useCheckedNonce(rootKey, nonce);

        emit LinkNonEVMWalletToRootWallet(walletHash, rootKey);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Remove
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

    function _removeNonEVMWalletLink(WalletLib.Wallet calldata wallet, uint256 nonce) internal {
        WalletLib.Layout storage ds = WalletLib.layout();
        address linkedWallet = msg.sender;
        bytes32 walletHash = keccak256(abi.encode(wallet));
        address rootKey = ds.rootKeyByWallet[linkedWallet];

        if (rootKey == address(0)) {
            revert WalletLink__NotLinked(linkedWallet, rootKey);
        }

        EnumerableSet.Bytes32Set storage walletHashes = ds
            .rootWalletByRootKey[rootKey]
            .walletHashes;

        if (!walletHashes.contains(walletHash)) {
            revert WalletLink__NonEVMWalletNotLinked(wallet.addr, rootKey);
        }

        // Check that the nonce is higher than the last nonce used
        _useCheckedNonce(rootKey, nonce);

        // Remove the wallet from the root wallet
        walletHashes.remove(walletHash);
        delete ds.rootWalletByRootKey[rootKey].walletByHash[walletHash];

        emit RemoveNonEVMWalletLink(walletHash, rootKey);
    }

    function _removeLink(
        address walletToRemove,
        LinkedWallet calldata rootWallet,
        uint256 nonce
    ) internal {
        WalletLib.Layout storage ds = WalletLib.layout();

        // Check walletToRemove or rootWallet.addr are not address(0)
        if (walletToRemove == address(0) || rootWallet.addr == address(0)) {
            revert WalletLink__InvalidAddress();
        }

        // Check walletToRemove is not the root wallet
        if (walletToRemove == rootWallet.addr) {
            revert WalletLink__CannotRemoveRootWallet();
        }

        // Check that the wallet is linked to the root wallet
        if (ds.rootKeyByWallet[walletToRemove] != rootWallet.addr) {
            revert WalletLink__NotLinked(walletToRemove, rootWallet.addr);
        }

        // If the wallet is the default wallet, unset it before removal
        if (ds.rootWalletByRootKey[rootWallet.addr].defaultWallet == walletToRemove) {
            ds.rootWalletByRootKey[rootWallet.addr].defaultWallet = address(0);
            emit SetDefaultWallet(rootWallet.addr, address(0));
        }

        // Verify that the root wallet signature contains the correct nonce and the correct wallet
        bytes32 structHash = _getLinkedWalletTypedDataHash(
            rootWallet.message,
            walletToRemove,
            nonce
        );
        bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

        // Verify the signature of the root wallet is correct for the nonce and wallet address
        if (ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr) {
            revert WalletLink__InvalidSignature();
        }

        //Check that the nonce being used is higher than the last nonce used
        _useCheckedNonce(rootWallet.addr, nonce);

        // Remove the link in the walletToRemove to root keys map
        ds.rootKeyByWallet[walletToRemove] = address(0);
        ds.walletsByRootKey[rootWallet.addr].remove(walletToRemove);

        emit RemoveLink(walletToRemove, msg.sender);
    }

    function _removeCallerLink() internal {
        WalletLib.Layout storage ds = WalletLib.layout();
        address walletToRemove = msg.sender;
        address rootWallet = ds.rootKeyByWallet[walletToRemove];

        if (rootWallet == address(0)) {
            revert WalletLink__NotLinked(walletToRemove, rootWallet);
        }

        // If the wallet is the default wallet, unset it before removal
        if (ds.rootWalletByRootKey[rootWallet].defaultWallet == walletToRemove) {
            ds.rootWalletByRootKey[rootWallet].defaultWallet = address(0);
            emit SetDefaultWallet(rootWallet, address(0));
        }

        // Remove the link in the walletToRemove to root keys map
        ds.rootKeyByWallet[walletToRemove] = address(0);
        ds.walletsByRootKey[rootWallet].remove(walletToRemove);

        emit RemoveLink(walletToRemove, rootWallet);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Read
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    function _getWalletsByRootKey(
        address rootKey
    ) internal view returns (address[] memory wallets) {
        return WalletLib.layout().walletsByRootKey[rootKey].values();
    }

    function _getAllWalletsByRootKey(
        address rootKey
    ) internal view returns (WalletLib.Wallet[] memory wallets) {
        WalletLib.Layout storage ds = WalletLib.layout();
        WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

        // Get all EVM linked wallets
        address[] memory linkedWallets = ds.walletsByRootKey[rootKey].values();

        // Get all non-EVM linked wallets
        bytes32[] memory nonEVMLinkedWallets = rootWallet.walletHashes.values();

        // Calculate total length for combined array
        uint256 evmLength = linkedWallets.length;
        uint256 nonEVMLength = nonEVMLinkedWallets.length;
        uint256 totalLength = evmLength + nonEVMLength;

        wallets = new WalletLib.Wallet[](totalLength);

        for (uint256 i; i < evmLength; ++i) {
            wallets[i] = WalletLib.Wallet({
                addr: LibString.toHexString(linkedWallets[i]),
                vmType: WalletLib.VirtualMachineType.EVM
            });
        }

        for (uint256 i; i < nonEVMLength; ++i) {
            WalletLib.Wallet memory wallet = rootWallet.walletByHash[nonEVMLinkedWallets[i]];
            uint256 index = evmLength + i;
            wallets[index] = wallet;
        }
    }

    function _getRootKeyByWallet(address wallet) internal view returns (address rootKey) {
        return WalletLib.layout().rootKeyByWallet[wallet];
    }

    function _checkIfLinked(address rootKey, address wallet) internal view returns (bool) {
        WalletLib.Layout storage ds = WalletLib.layout();
        return ds.rootKeyByWallet[wallet] == rootKey;
    }

    function _checkIfNonEVMWalletLinked(
        address rootKey,
        bytes32 walletHash
    ) internal view returns (bool) {
        return WalletLib.layout().rootKeyByHash[walletHash] == rootKey;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   Default Wallet Functions                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setDefaultWallet(address caller, address defaultWallet) internal {
        // check that the default wallet is not address(0)
        if (defaultWallet == address(0)) {
            revert WalletLink__InvalidAddress();
        }

        address rootKey = _getRootKeyByWallet(defaultWallet);

        // check that the default wallet is linked to a root wallet
        if (rootKey == address(0)) {
            revert WalletLink__NotLinked(defaultWallet, rootKey);
        }

        // check that the caller can only be a linked wallet or the root wallet
        if (!_checkIfLinked(rootKey, caller) && caller != rootKey) {
            revert WalletLink__NotLinked(caller, rootKey);
        }

        WalletLib.Layout storage ds = WalletLib.layout();
        WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

        // check that the default isn't already the default wallet
        if (rootWallet.defaultWallet == defaultWallet) {
            revert WalletLink__DefaultWalletAlreadySet();
        }

        rootWallet.defaultWallet = defaultWallet;

        emit SetDefaultWallet(rootKey, defaultWallet);
    }

    function _getDefaultWallet(address rootKey) internal view returns (address defaultWallet) {
        return WalletLib.layout().rootWalletByRootKey[rootKey].defaultWallet;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Dependencies Functions                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _setDependency(bytes32 dependency, address dependencyAddress) internal {
        WalletLib.layout().dependencies[dependency] = dependencyAddress;
    }

    function _getDependency(bytes32 dependency) internal view returns (address) {
        return WalletLib.layout().dependencies[dependency];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Helpers
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    function _validateNonEVMWalletInputs(
        WalletLib.Layout storage ds,
        NonEVMLinkedWallet calldata nonEVMWallet,
        bytes32 walletHash
    ) internal view {
        address caller = msg.sender;

        // Check that the wallet address string is not empty
        if (bytes(nonEVMWallet.wallet.addr).length == 0) {
            revert WalletLink__InvalidNonEVMAddress();
        }

        // Limit wallet address length
        if (bytes(nonEVMWallet.wallet.addr).length > 100) {
            revert WalletLink__InvalidNonEVMAddress();
        }

        address callerRootKey = ds.rootKeyByWallet[msg.sender];

        // Check that the caller wallet is linked to a root wallet
        if (callerRootKey == address(0)) {
            revert WalletLink__NotLinked(caller, address(0));
        }

        address rootKey = ds.rootKeyByHash[walletHash];

        // Ensure the caller's root key is consistent with intended operations
        if (rootKey != address(0) && rootKey != callerRootKey) {
            revert WalletLink__RootKeyMismatch(callerRootKey, rootKey);
        }
    }

    function _verifyWallets(
        WalletLib.Layout storage db,
        address wallet,
        address rootWallet
    ) internal view {
        // Check wallet or rootWallet.addr are not address(0)
        if (wallet == address(0) || rootWallet == address(0)) {
            revert WalletLink__InvalidAddress();
        }

        // Check not linking wallet to itself
        if (wallet == rootWallet) {
            revert WalletLink__CannotLinkToSelf();
        }

        // Check that the wallet is not already linked to the root wallet
        if (db.rootKeyByWallet[wallet] != address(0)) {
            revert WalletLink__LinkAlreadyExists(wallet, rootWallet);
        }

        // Check that the root wallet is not already linked to another root wallet
        if (db.rootKeyByWallet[rootWallet] != address(0)) {
            revert WalletLink__LinkedToAnotherRootKey(wallet, db.rootKeyByWallet[rootWallet]);
        }

        // Check that the wallet is not itself a root wallet
        if (db.walletsByRootKey[wallet].length() > 0) {
            revert WalletLink__CannotLinkToRootWallet(wallet, rootWallet);
        }

        // Check that we haven't reached the maximum number of linked wallets
        if (db.walletsByRootKey[rootWallet].length() >= MAX_LINKED_WALLETS) {
            revert WalletLink__MaxLinkedWalletsReached();
        }
    }

    function _verifySolanaWallet(NonEVMLinkedWallet calldata nonEVMWallet) internal {
        SolanaSpecificData memory solanaSpecificData = abi.decode(
            nonEVMWallet.extraData[0].value,
            (SolanaSpecificData)
        );

        // Check that the extPubKey and the wallet address match
        if (
            !SolanaUtils.isValidSolanaAddress(
                nonEVMWallet.wallet.addr,
                solanaSpecificData.extPubKey
            )
        ) {
            revert WalletLink__AddressMismatch();
        }

        ISCL_EIP6565 sclEIP6565 = ISCL_EIP6565(_getDependency(SCL_EIP6565));

        (uint256 r, uint256 s) = abi.decode(nonEVMWallet.signature, (uint256, uint256));

        bool isValidSignature = sclEIP6565.Verify_LE(
            nonEVMWallet.message,
            r,
            s,
            solanaSpecificData.extPubKey
        );

        if (!isValidSignature) {
            revert WalletLink__InvalidSignature();
        }
    }

    function _validateAddressFormatByVMType(WalletLib.Wallet calldata wallet) internal pure {
        if (wallet.vmType == WalletLib.VirtualMachineType.SVM) {
            // Validate Solana address format (base58, 32-44 chars)
            if (bytes(wallet.addr).length < 32 || bytes(wallet.addr).length > 44) {
                CustomRevert.revertWith(WalletLink__InvalidNonEVMAddress.selector);
            }
        }
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
            keccak256(abi.encode(_LINKED_WALLET_TYPEHASH, keccak256(bytes(message)), addr, nonce));
    }
}
