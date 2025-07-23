-- query name: towns created
-- query link: https://dune.com/queries/4223614
-- materialized table: dune.towns_protocol.result_towns_created

SELECT block_time,
       block_number,
       bytearray_to_int256(SUBSTRING(topic2 FROM 1 FOR 32)) AS town_owner_token_id,
       SUBSTRING(topic3 FROM 13)                            AS town_address,
       SUBSTRING(topic1 FROM 13)                            AS town_owner,
       tx_hash,
       index                                                AS log_index
FROM base.logs
WHERE
  -- SpaceFactory
    contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
  -- SpaceCreated(address,uint256,address)
  AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
  AND block_time > CAST('2024-05-01' AS timestamp)
ORDER BY block_time DESC;

