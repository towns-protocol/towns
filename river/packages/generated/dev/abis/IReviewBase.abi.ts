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
        "name": "review",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct ReviewStorage.Content",
        "components": [
          {
            "name": "comment",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "rating",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
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
        "name": "review",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct ReviewStorage.Content",
        "components": [
          {
            "name": "comment",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "rating",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
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
  }
] as const
