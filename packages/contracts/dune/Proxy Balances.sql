-- Proxy Balances - Current TOWNS token balance in each delegation proxy
-- Calculated from Transfer events on TOWNS token contract
-- Contract: 0x00000000A22C618fd6b4D7E9A335C4B96B189a38 (TOWNS token)
-- Event: Transfer(address,address,uint256) 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

WITH proxy_addresses AS (SELECT DISTINCT proxy_address
                         FROM dune.towns_protocol.result_delegation_proxies),

     -- Get all transfers involving proxy addresses  
     proxy_transfers AS (SELECT substring(l.topic1 FROM 13)  AS from_address,
                                substring(l.topic2 FROM 13)  AS to_address,
                                bytearray_to_uint256(l.data) AS amount,
                                CASE
                                    WHEN substring(l.topic1 FROM 13) IN (SELECT proxy_address FROM proxy_addresses)
                                        THEN substring(l.topic1 FROM 13)
                                    ELSE substring(l.topic2 FROM 13)
                                    END                      AS proxy_address,
                                CASE
                                    WHEN substring(l.topic1 FROM 13) IN (SELECT proxy_address FROM proxy_addresses)
                                        THEN 'outflow'
                                    ELSE 'inflow'
                                    END                      AS flow_type
                         FROM base.logs l
                         WHERE l.contract_address = 0x00000000A22C618fd6b4D7E9A335C4B96B189a38
                           AND l.topic0 = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef -- Transfer
                           AND l.block_time > CAST('2024-12-17' AS timestamp)
                           AND (substring(l.topic1 FROM 13) IN (SELECT proxy_address FROM proxy_addresses)
                             OR substring(l.topic2 FROM 13) IN (SELECT proxy_address FROM proxy_addresses))),

     -- Calculate balance changes per proxy
     proxy_flows AS (SELECT proxy_address,
                            SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE 0 END)  AS total_inflow,
                            SUM(CASE WHEN flow_type = 'outflow' THEN amount ELSE 0 END) AS total_outflow
                     FROM proxy_transfers
                     GROUP BY proxy_address)

SELECT pf.proxy_address,
       (pf.total_inflow - pf.total_outflow) AS current_balance
FROM proxy_flows pf
ORDER BY current_balance DESC;
