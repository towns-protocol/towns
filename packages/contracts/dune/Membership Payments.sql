-- Optimized with materialized tables
WITH subscription_transactions AS (SELECT DISTINCT ms.town_address,
                                                   ms.tx_hash
                                   FROM dune.towns_protocol.result_membership_subscriptions ms),

-- Get actual ETH value using pre-computed ETH flows
     space_payments AS (SELECT ef.block_time,
                               ef.eth_amount
                        FROM dune.towns_protocol.result_towns_eth_flows ef
                                 JOIN subscription_transactions st
                                      ON ef.tx_hash = st.tx_hash
                                          AND ef.to = st.town_address
                        WHERE ef.flow_type = 'town_in'),

-- Aggregate daily
     summary AS (SELECT date_trunc('day', block_time) AS day, SUM (eth_amount) AS daily_revenue
FROM space_payments
GROUP BY 1
    ),

-- Complete calendar
    days AS (
SELECT CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), current_date, INTERVAL '1' day
    )
    ) AS t(day)
    )

SELECT d.day,
       COALESCE(s.daily_revenue, 0) AS   daily_revenue,
       SUM(COALESCE(s.daily_revenue, 0)) OVER (ORDER BY d.day) AS total_revenue
FROM days d
         LEFT JOIN summary s ON d.day = s.day
ORDER BY d.day DESC;
