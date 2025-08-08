-- Optimized with materialized tables
-- Get subscription and tip transactions for filtering
WITH subscription_tx AS (SELECT DISTINCT ms.tx_hash, ms.town_address
                         FROM dune.towns_protocol.result_membership_subscriptions ms),

     tip_tx AS (SELECT DISTINCT l.tx_hash, l.contract_address AS town_address
                FROM base.logs l
                         JOIN dune.towns_protocol.result_towns_created tc
                              ON l.contract_address = tc.town_address
                WHERE l.topic0 = 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b
                  AND l.block_time > CAST('2024-12-01' AS timestamp)),

-- Aggregate daily protocol fees by source using materialized ETH flows
     summary_membership_fees
         AS (SELECT date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS membership_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
    JOIN subscription_tx st
ON ef.tx_hash = st.tx_hash AND ef."from" = st.town_address
WHERE ef.flow_type = 'protocol_fee'
  AND ef.block_time
    > CAST ('2024-05-01' AS timestamp)
GROUP BY 1),
    summary_tipping_fees AS (
SELECT date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS tipping_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
    JOIN tip_tx tt
ON ef.tx_hash = tt.tx_hash AND ef."from" = tt.town_address
WHERE ef.flow_type = 'protocol_fee'
  AND ef.block_time
    > CAST ('2024-12-01' AS timestamp)
GROUP BY 1),
    summary_trading_fees AS (
SELECT date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS trading_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
WHERE ef.flow_type = 'protocol_fee'
  AND ef."from" = 0x95A2a333D30c8686dE8D01AC464d6034b9aA7b24
  AND ef.block_time
    > CAST ('2025-05-01' AS timestamp)
GROUP BY 1),
    summary_other_fees AS (
SELECT date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS other_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
WHERE ef.flow_type = 'protocol_fee'
  AND ef."from" IN (SELECT town_address FROM dune.towns_protocol.result_towns_created)
  AND ef.block_time
    > CAST ('2024-05-01' AS timestamp)
  AND NOT EXISTS (SELECT 1 FROM subscription_tx st WHERE st.tx_hash = ef.tx_hash)
  AND NOT EXISTS (SELECT 1 FROM tip_tx tt WHERE tt.tx_hash = ef.tx_hash)
GROUP BY 1),

-- Generate complete date range for chart
    days AS
    (
SELECT CAST (day AS timestamp) AS day
FROM unnest(sequence (DATE ('2024-5-30'), CURRENT_DATE, INTERVAL '1' day)) AS t(day)
    )

-- Final output: daily and cumulative protocol fees by source
SELECT d.day,
       COALESCE(smf.membership_revenue, 0)                                 AS membership_revenue,
       COALESCE(stf.tipping_revenue, 0)                                    AS tipping_revenue,
       COALESCE(str.trading_revenue, 0)                                    AS trading_revenue,
       COALESCE(sof.other_revenue, 0)                                      AS other_revenue,
       (COALESCE(smf.membership_revenue, 0) + COALESCE(stf.tipping_revenue, 0) +
        COALESCE(str.trading_revenue, 0) + COALESCE(sof.other_revenue, 0)) AS total_revenue,
       SUM(COALESCE(smf.membership_revenue, 0) + COALESCE(stf.tipping_revenue, 0) +
           COALESCE(str.trading_revenue, 0) + COALESCE(sof.other_revenue, 0)) OVER (ORDER BY d.day) AS cumulative_total
FROM days d
         LEFT JOIN summary_membership_fees smf ON d.day = smf.day
         LEFT JOIN summary_tipping_fees stf ON d.day = stf.day
         LEFT JOIN summary_trading_fees str ON d.day = str.day
         LEFT JOIN summary_other_fees sof ON d.day = sof.day
ORDER BY 1 DESC
