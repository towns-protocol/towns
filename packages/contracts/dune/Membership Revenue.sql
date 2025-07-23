-- Optimized with materialized tables
WITH subscription_transactions AS (SELECT DISTINCT ms.town_address,
                                                   ms.tx_hash
                                   FROM dune.towns_protocol.result_membership_subscriptions ms
                                   WHERE ms.block_time > CAST('2024-05-01' AS timestamp)),

-- Payments coming into towns from membership transactions
     summary_payments AS (SELECT date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS gross_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
    JOIN subscription_transactions st
ON ef.tx_hash = st.tx_hash
    AND ef.to = st.town_address
WHERE ef.flow_type = 'town_in'
GROUP BY 1
    ),

-- Refunds going out of towns from membership transactions (protocol fees already excluded)
    summary_refunds AS (
SELECT
    date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS total_refunds
FROM dune.towns_protocol.result_towns_eth_flows ef
    JOIN subscription_transactions st
ON ef.tx_hash = st.tx_hash
    AND ef."from" = st.town_address
WHERE ef.flow_type = 'town_out'
GROUP BY 1
    ),

-- Protocol fees from membership transactions (pre-classified)
    summary_protocol_fees AS (
SELECT
    date_trunc('day', ef.block_time) AS day, SUM (ef.eth_amount) AS protocol_revenue
FROM dune.towns_protocol.result_towns_eth_flows ef
    JOIN subscription_transactions st
ON ef.tx_hash = st.tx_hash
    AND ef."from" = st.town_address
WHERE ef.flow_type = 'protocol_fee'
GROUP BY 1
    ),

-- Complete calendar
    days AS (
SELECT CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), CURRENT_DATE, INTERVAL '1' day
    )
    ) AS t(day)
    )

SELECT d.day,
       (COALESCE(sp.gross_revenue, 0) - COALESCE(sr.total_refunds, 0)) AS net_revenue,
       COALESCE(spf.protocol_revenue, 0)                               AS protocol_revenue,
       SUM(COALESCE(sp.gross_revenue, 0) - COALESCE(sr.total_refunds, 0))
                                                                          OVER (ORDER BY d.day) AS total_net_revenue, SUM(COALESCE(spf.protocol_revenue, 0))
    OVER (ORDER BY d.day) AS total_protocol_revenue
FROM days d
         LEFT JOIN summary_payments sp ON d.day = sp.day
         LEFT JOIN summary_refunds sr ON d.day = sr.day
         LEFT JOIN summary_protocol_fees spf ON d.day = spf.day
ORDER BY d.day DESC;
