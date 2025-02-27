export default [
  {
    "type": "event",
    "name": "ReviewAdded",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "comment",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "rating",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReviewDeleted",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReviewUpdated",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "comment",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "rating",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ReviewFacet__InvalidCommentLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReviewFacet__InvalidRating",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReviewFacet__ReviewAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReviewFacet__ReviewDoesNotExist",
    "inputs": []
  }
] as const
