export default [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_factory",
        "type": "address"
      }
    ],
    "name": "setFactory",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_tokenURI",
        "type": "string"
      }
    ],
    "name": "setTokenURI",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
