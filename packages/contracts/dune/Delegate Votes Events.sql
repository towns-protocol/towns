-- Delegate Votes Events - Raw DelegateVotesChanged events from TOWNS token
-- Contract: 0x00000000A22C618fd6b4D7E9A335C4B96B189a38
-- Event: DelegateVotesChanged(address,uint256,uint256) 0xdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724

SELECT l.block_time,
       l.block_number,
       l.tx_hash,
       l.index                                                AS log_index,
       substring(l.topic1 FROM 13)                            AS delegate,
       bytearray_to_uint256(substring(l.data FROM 1 FOR 32))  AS previous_votes,
       bytearray_to_uint256(substring(l.data FROM 33 FOR 32)) AS new_votes
FROM base.logs l
WHERE l.contract_address = 0x00000000A22C618fd6b4D7E9A335C4B96B189a38
  AND l.topic0 = 0xdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724
  AND l.block_time > CAST('2025-02-01' AS timestamp)
ORDER BY block_time DESC, log_index DESC;
