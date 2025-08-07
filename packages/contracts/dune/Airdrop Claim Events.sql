-- Airdrop Claims - Individual claim data as materialized table
-- Contract: 0xe55fEE191604cdBeb874F87A28Ca89aED401C303
-- Events:
-- DropFacet_Claimed_And_Staked(uint256,address,address,uint256) 0xf08f338c8905e343697a35fef11af2f611a36658016e0653521354c865373ea7
-- DropFacet_Claimed_WithPenalty(uint256,address,address,uint256) 0x970af01ab25e63f8131277859b2c17e9a07c2eb257e6db87449000d91c0f8401

SELECT l.block_time,
       l.block_number,
       CASE
           WHEN l.topic0 = 0x970af01ab25e63f8131277859b2c17e9a07c2eb257e6db87449000d91c0f8401
               THEN 'with_penalty'
           WHEN l.topic0 = 0xf08f338c8905e343697a35fef11af2f611a36658016e0653521354c865373ea7
               THEN 'staked'
           END                                               AS claim_type,
       bytearray_to_uint256(l.topic1)                        AS condition_id,
       substring(l.topic3 FROM 13)                           AS account,
       bytearray_to_uint256(substring(l.data FROM 1 FOR 32)) AS amount,
       l.tx_hash,
       l.index                                               AS log_index
FROM base.logs l
WHERE l.contract_address = 0xe55fEE191604cdBeb874F87A28Ca89aED401C303
  AND l.topic0 IN (
                   0x970af01ab25e63f8131277859b2c17e9a07c2eb257e6db87449000d91c0f8401,
                   0xf08f338c8905e343697a35fef11af2f611a36658016e0653521354c865373ea7
    )
  AND l.block_time > CAST('2025-07-15' AS timestamp)
ORDER BY block_time DESC, log_index DESC;
