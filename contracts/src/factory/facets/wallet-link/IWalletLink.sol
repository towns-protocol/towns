// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IWalletLinkBase {
  // =============================================================
  //                           Enums
  // =============================================================

  /// @notice Supported virtual machine types for wallet linking
  enum VirtualMachineType {
    EVM, // Ethereum Virtual Machine (Ethereum, BSC, Polygon, etc.)
    SVM, // Solana Virtual Machine
    MOVE, // Move Virtual Machine (Aptos, Sui)
    CVM, // Cosmos Virtual Machine
    WASM, // WebAssembly VM (Polkadot, NEAR)
    AVM, // Avalanche Virtual Machine
    UNKNOWN // For future compatibility
  }

  // =============================================================
  //                      Core Data Types
  // =============================================================

  /// @notice Core wallet data structure
  struct WalletData {
    string addr;
    VirtualMachineType vmType;
    uint8 walletType;
  }

  // =============================================================
  //                    Linking Data Types
  // =============================================================

  /// @notice Struct for EVM wallet linking operations
  struct LinkedWalletData {
    address addr;
    bytes signature;
    string message;
  }

  /// @notice Struct for non-EVM wallet linking operations
  struct NonEVMLinkedWalletData {
    string addr;
    bytes signature; // Signature in the VM's native format
    string message; // Message that was signed
    VirtualMachineType vmType;
    VMSpecificData[] extraData; // Flexible array for VM-specific requirements
  }

  // =============================================================
  //               VM-Specific Data Types
  // =============================================================

  /// @notice Generic structure for VM-specific data
  struct VMSpecificData {
    string key;
    bytes value;
  }

  /// @notice Solana-specific wallet data
  /// @dev This will be encoded in extraData for Solana wallets with key being "extPubKey"
  /// bytes calldata value = nonEVMWallet.extraData[0].value;
  /// SolanaSpecificData calldata solanaSpecificData;
  /// assembly {
  ///   solanaSpecificData := value.offset
  /// }
  struct SolanaSpecificData {
    uint256[5] extPubKey; // Extended public key for Solana
  }

  // =============================================================
  //                           Events
  // =============================================================

  /// @notice Emitted when a user links their wallet to a rootKey
  event LinkWalletToRootKey(address indexed wallet, address indexed rootKey);

  /// @notice Emitted when two wallets are unlinked
  event RemoveLink(address indexed wallet, address indexed secondWallet);

  /// @notice Emitted when a default wallet is set for a root key
  event SetDefaultWallet(
    address indexed rootKey,
    address indexed defaultWallet
  );

  /// @notice Emitted when a non-EVM wallet is linked to a root key
  event LinkNonEVMWalletToRootWallet(
    bytes32 indexed walletHash,
    address indexed rootKey
  );

  /// @notice Emitted when a non-EVM wallet is removed from a root key
  event RemoveNonEVMWalletLink(
    bytes32 indexed walletHash,
    address indexed rootKey
  );

  // =============================================================
  //                      Errors
  // =============================================================
  error WalletLink__InvalidAddress();
  error WalletLink__LinkAlreadyExists(address wallet, address rootKey);
  error WalletLink__LinkedToAnotherRootKey(address wallet, address rootKey);
  error WalletLink__InvalidSignature();
  error WalletLink__NotLinked(address wallet, address rootKey);
  error WalletLink__CannotRemoveRootWallet();
  error WalletLink__CannotLinkToSelf();
  error WalletLink__CannotLinkToRootWallet(address wallet, address rootKey);
  error WalletLink__DefaultWalletAlreadySet();
  error WalletLink__MaxLinkedWalletsReached();
  error WalletLink__CannotRemoveDefaultWallet();
  error WalletLink__UnsupportedVMType();
  error WalletLink__InvalidVMSpecificData(string key, bytes value);
  error WalletLink__InvalidMessage();
  error WalletLink__NonEVMWalletAlreadyLinked(string wallet, address rootKey);
  error WalletLink__InvalidNonEVMAddress();
  error WalletLink__RootKeyMismatch(address callerRootKey, address rootKey);
  error WalletLink__NonEVMWalletNotLinked(string wallet, address rootKey);
  error WalletLink__AddressMismatch();
}

interface IWalletLink is IWalletLinkBase {
  /**
   * @notice Link caller wallet to a root wallet
   * @param rootWallet the root wallet that the caller is linking to
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkCallerToRootKey(
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) external;

  /**
   * @notice Link a wallet to a root wallet
   * @param wallet the wallet being linked to the root wallet
   * @param rootWallet the root wallet that the caller is linking to
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkWalletToRootKey(
    LinkedWalletData calldata wallet,
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) external;

  /**
   * @notice Link a non-EVM wallet to a root wallet
   * @param wallet the wallet being linked to the root wallet
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   * @dev The function can only be called by an already linked wallet
   */
  function linkNonEVMWalletToRootKey(
    NonEVMLinkedWalletData calldata wallet,
    uint256 nonce
  ) external;

  /**
   * @notice Remove a non-EVM wallet link from a root wallet
   * @param addr the address of the wallet being removed from the root wallet
   * @param vmType the type of VM the wallet belongs to
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   * @dev The function can only be called by an already linked wallet
   */
  function removeNonEVMWalletLink(
    string calldata addr,
    VirtualMachineType vmType,
    uint256 nonce
  ) external;

  /**
   * @notice Called via the rootkey signing a message to a remove a wallet from itself
   * @param wallet the wallet being unlinked from the sending wallet
   */
  function removeLink(
    address wallet,
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) external;

  /**
   * @notice Remove the caller's link to their root key
   */
  function removeCallerLink() external;

  /**
   * @notice Set the default wallet by the root wallet
   * @param defaultWallet the wallet being set as the default wallet
   * @dev A wallet can only be set as the default wallet if it is already linked to the root wallet
   * @dev The default wallet can only be an EVM wallet for now
   */
  function setDefaultWallet(address defaultWallet) external;

  // =============================================================
  //                      External - Read
  // =============================================================

  /**
   * @notice Returns the default wallet for a root key
   * @param rootKey the public key of the users rootkey to find associated wallets for
   * @return defaultWallet the default wallet for the root key
   */
  function getDefaultWallet(address rootKey) external view returns (address);

  /**
   * @notice Returns all wallets linked to a root key
   * @param rootKey the public key of the users rootkey to find associated wallets for
   * @return wallets an array of ethereum wallets linked to this root key
   */
  function getWalletsByRootKey(
    address rootKey
  ) external view returns (address[] memory wallets);

  /**
   * @notice Returns all wallets linked to a root key with their delegations
   * @param rootKey the public key of the users rootkey to find associated wallets for
   * @return wallets an array of ethereum wallets linked to this root key
   */
  function getWalletsByRootKeyWithDelegations(
    address rootKey
  ) external view returns (address[] memory wallets);

  /**
   * @notice Returns the root key for a given wallet
   * @param wallet the ethereum wallet to find associated root key for
   * @return rootKey the rootkey that this wallet is linked to
   */
  function getRootKeyForWallet(
    address wallet
  ) external view returns (address rootKey);

  /**
   * @notice checks if a root key and wallet are linked
   * @param rootKey the public key of the users rootkey to check
   * @param wallet the ethereum wallet to check
   * @return areLinked boolean if they are linked together
   */
  function checkIfLinked(
    address rootKey,
    address wallet
  ) external view returns (bool);

  /**
   * @notice checks if a root key and non-EVM wallet are linked
   * @param rootKey the public key of the users rootkey to check
   * @param walletHash the hash of the non-EVM wallet to check
   * @return areLinked boolean if they are linked together
   */
  function checkIfNonEVMWalletLinked(
    address rootKey,
    bytes32 walletHash
  ) external view returns (bool);

  /**
   * @notice gets the latest nonce for a rootkey to use a higher one for next link action
   * @param rootKey the public key of the users rootkey to check
   */
  function getLatestNonceForRootKey(
    address rootKey
  ) external view returns (uint256);

  /**
   * @notice gets the dependency address for a given dependency label
   * @param dependency the dependency label to get
   */
  function getDependency(bytes32 dependency) external view returns (address);

  /**
   * @notice sets the dependency address for a given dependency label
   * @param dependency the dependency label to set
   * @param dependencyAddress the dependency address to set
   */
  function setDependency(
    bytes32 dependency,
    address dependencyAddress
  ) external;
}
