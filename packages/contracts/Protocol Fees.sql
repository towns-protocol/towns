-- Get all spaces created by SpaceFactory
WITH space_created AS (SELECT substring(topic3 from 13) AS space_address
                       FROM base.logs
                       WHERE contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
                         -- SpaceCreated(address,uint256,address)
                         AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
                         AND block_time > cast('2024-05-01' AS timestamp)),

-- Track ETH transfers from spaces to treasury (membership/tipping fees)
     space_treasury_traces AS (SELECT t.block_time,
                                      t.value,
                                      t.tx_hash
                               FROM base.traces t
                                        INNER JOIN space_created sc ON sc.space_address = t."from"
                               WHERE t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
                                 AND t.success = true
                                 AND t.call_type = 'call'
                                 AND t.value > 0
                                 AND t.block_time > CAST('2024-05-01' AS timestamp)),

     -- Track ETH transfers from SwapRouter to treasury (trading fees)
     router_treasury_traces AS (SELECT t.block_time,
                                       t.value
                                FROM base.traces t
                                WHERE t."from" = 0x95A2a333D30c8686dE8D01AC464d6034b9aA7b24
                                  AND t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
                                  AND t.success = true
                                  AND t.call_type = 'call'
                                  AND t.value > 0
                                  AND t.block_time > CAST('2025-05-01' AS timestamp)),

     -- Get subscription and tip transactions for filtering
     subscription_tx AS (SELECT DISTINCT l.tx_hash, l.contract_address AS space_address
                         FROM base.logs l
                                  JOIN space_created sc
                                       ON l.contract_address = sc.space_address
                         WHERE l.topic0 = 0x2ec2be2c4b90c2cf13ecb6751a24daed6bb741ae5ed3f7371aabf9402f6d62e8
                           AND l.block_time > CAST('2024-05-01' AS timestamp)),

     tip_tx AS (SELECT DISTINCT l.tx_hash, l.contract_address AS space_address
                FROM base.logs l
                         JOIN space_created sc
                              ON l.contract_address = sc.space_address
                WHERE l.topic0 = 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b
                  AND l.block_time > CAST('2024-12-01' AS timestamp)),

-- Aggregate daily protocol fees by source
     summary_membership_fees
         AS (SELECT date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS membership_revenue
FROM base.traces t
    JOIN subscription_tx st
ON t.tx_hash = st.tx_hash AND t."from" = st.space_address
WHERE t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
  AND t.success = true
  AND t.call_type = 'call'
  AND t.value
    > 0
  AND t.block_time
    > CAST ('2024-05-01' AS timestamp)
GROUP BY 1),
    summary_tipping_fees AS (
SELECT date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS tipping_revenue
FROM base.traces t
    JOIN tip_tx tt
ON t.tx_hash = tt.tx_hash AND t."from" = tt.space_address
WHERE t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
  AND t.success = true
  AND t.call_type = 'call'
  AND t.value
    > 0
  AND t.block_time
    > CAST ('2024-12-01' AS timestamp)
GROUP BY 1),
    summary_trading_fees AS (
SELECT date_trunc('day', block_time) AS day, SUM (value) / 1e18 AS trading_revenue
FROM router_treasury_traces
GROUP BY 1),
    summary_other_fees AS (
SELECT date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS other_revenue
FROM space_treasury_traces t
WHERE NOT EXISTS (SELECT 1 FROM subscription_tx st WHERE st.tx_hash = t.tx_hash)
  AND NOT EXISTS (SELECT 1 FROM tip_tx tt WHERE tt.tx_hash = t.tx_hash)
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
