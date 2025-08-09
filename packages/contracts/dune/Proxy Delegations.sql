-- Proxy Delegations - Current delegation state of all proxy contracts
-- Tracks DelegateChanged events from TOWNS token contract
-- Contract: 0x00000000A22C618fd6b4D7E9A335C4B96B189a38 (TOWNS token)
-- Event: DelegateChanged(address,address,address) 0x3134e8a2e6d97e929a7e54011ea5485d7d196dd5f0ba4d4ef95803e8e3fc257f

WITH proxy_addresses AS (SELECT DISTINCT proxy_address
                         FROM dune.towns_protocol.result_delegation_proxies),

     delegation_changes AS (SELECT substring(l.topic1 FROM 13) AS delegator,
                                   substring(l.topic2 FROM 13) AS from_delegate,
                                   substring(l.topic3 FROM 13) AS to_delegate,
                                   l.block_time,
                                   l.block_number,
                                   l.tx_hash,
                                   l.index                     AS log_index,
                                   ROW_NUMBER()                   OVER (PARTITION BY substring(l.topic1 FROM 13) ORDER BY l.block_number DESC, l.index DESC) AS rn
                            FROM base.logs l
                                     JOIN proxy_addresses pa
                                          ON substring(l.topic1 FROM 13) = pa.proxy_address
                            WHERE l.contract_address = 0x00000000A22C618fd6b4D7E9A335C4B96B189a38
                              AND l.topic0 =
                                  0x3134e8a2e6d97e929a7e54011ea5485d7d196dd5f0ba4d4ef95803e8e3fc257f -- DelegateChanged
                              AND l.block_time > CAST('2024-12-17' AS timestamp))

SELECT delegator AS proxy_address,
       from_delegate,
       to_delegate,
       CASE
           WHEN to_delegate = 0x0000000000000000000000000000000000000000 THEN 'undelegated'
           ELSE 'delegated'
           END   AS status,
       block_time,
       block_number,
       tx_hash,
       log_index
FROM delegation_changes
WHERE rn = 1 -- Latest delegation state only
ORDER BY block_time DESC;
