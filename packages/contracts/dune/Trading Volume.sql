-- Get all towns created
WITH towns_created AS (SELECT town_address
                       FROM dune.towns_protocol.result_towns_created),
     -- Track SwapExecuted events and calculate ETH volume
     swap_events AS (SELECT l.block_time,
                            CASE
                                -- When tokenIn is ETH (0xEeeE...), use amountIn
                                WHEN substring(l.topic2 FROM 13) = 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                                    THEN bytearray_to_uint256(substring(l.data FROM 1 FOR 32))
                                -- When tokenOut is ETH (0xEeeE...), use amountOut
                                WHEN substring(l.topic3 FROM 13) = 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                                    THEN bytearray_to_uint256(substring(l.data FROM 33 FOR 32))
                                -- Skip non-ETH pairs
                                ELSE 0
                                END AS volume
                     FROM base.logs l
                              JOIN towns_created tc
                                   ON l.contract_address = tc.town_address
                     WHERE
                       -- SwapExecuted(address,address,address,uint256,uint256,address)
                         l.topic0 = 0x300b4a9ac356114be2eaffe0f530cd615f14560df4b634adc11142d1358e8976
                       AND l.block_time > cast('2025-05-01' AS timestamp)),
     -- Track protocol fees from SwapRouter to treasury (trading fees)
     router_treasury_traces AS (SELECT t.block_time,
                                       t.value
                                FROM base.traces t
                                WHERE t."from" = 0x95A2a333D30c8686dE8D01AC464d6034b9aA7b24
                                  AND t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
                                  AND t.success = true
                                  AND t.call_type = 'call'
                                  AND t.value > 0
                                  AND t.block_time > cast('2025-05-01' AS timestamp)),
     -- Aggregate daily volume in ETH
     summary AS (SELECT date_trunc('day', block_time) AS day, SUM (volume) / 1e18 AS daily_volume
FROM swap_events
WHERE volume > 0
GROUP BY 1
    ),
    -- Aggregate daily protocol fees from trading
    summary_protocol_fees AS (
SELECT date_trunc('day', block_time) AS day, SUM (value) / 1e18 AS protocol_revenue
FROM router_treasury_traces
GROUP BY 1
    ),
    -- Generate complete date range for chart
    days AS (
SELECT
    CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2025-05-01'), current_date, INTERVAL '1' day
    )
    ) AS t(day)
    )
-- Final output: daily and cumulative trading volume and protocol fees
SELECT d.day,
       COALESCE(s.daily_volume, 0)       AS daily_volume,
       COALESCE(spf.protocol_revenue, 0) AS protocol_revenue,
       SUM(COALESCE(s.daily_volume, 0))     OVER (
    ORDER BY d.day
  )                                      AS total_volume, SUM(COALESCE(spf.protocol_revenue, 0)) OVER (
    ORDER BY d.day
  )                                      AS total_protocol_revenue
FROM days d
         LEFT JOIN summary s
                   ON d.day = s.day
         LEFT JOIN summary_protocol_fees spf
                   ON d.day = spf.day
ORDER BY d.day DESC;
