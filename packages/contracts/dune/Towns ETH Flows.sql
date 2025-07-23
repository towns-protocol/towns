-- Town ETH Flow Traces - Materialized Table
-- Table: dune.towns_protocol.result_town_traces
--
-- IMPORTANT: Flow classification prioritizes protocol fees over town perspective
-- - Town → Protocol Treasury = 'protocol_fee' (NOT 'town_out')
-- - Town → Users/Router = 'town_out' 
-- - This means 'town_out' does NOT include protocol fee payments from towns

WITH towns AS (SELECT town_address
               FROM dune.towns_protocol.result_towns_created)

SELECT t.block_time,
       t.block_number,
       CASE
           WHEN t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81 THEN 'protocol_fee'
           WHEN t.to IN (SELECT town_address FROM towns) THEN 'town_in'
           WHEN t."from" IN (SELECT town_address FROM towns) THEN 'town_out'
           ELSE 'other'
           END        as flow_type,
       t."from",
       t.to,
       t.value / 1e18 as eth_amount,
       t.tx_hash
FROM base.traces t
WHERE t.success = true
  AND t.call_type = 'call'
  AND t.value > 0
  AND t.block_time > CAST('2024-05-01' AS timestamp)
  AND (
    t.to IN (SELECT town_address FROM towns)
        OR t."from" IN (SELECT town_address FROM towns)
        OR t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
    )
ORDER BY t.block_time DESC;
