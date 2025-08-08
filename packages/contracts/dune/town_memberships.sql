-- Daily town membership growth using materialized tables
WITH member_added AS (SELECT town_address   AS town,
                             block_time,
                             member_address AS recipient,
                             token_id       AS tokenid
                      FROM dune.towns_protocol.result_membership_subscriptions
                      WHERE event_type = 'mint'),
     summary AS (SELECT DATE_TRUNC('day', block_time) AS day, COUNT (*) AS member_added
FROM member_added
GROUP BY 1),
    days AS (
SELECT CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), CAST (now() AS date), INTERVAL '1' day
    )
    ) AS t(day))

SELECT d.day,
       s.member_added AS              daily_members_added,
       SUM(COALESCE(member_added, 0)) OVER (ORDER BY d.day) AS total_members_added
FROM days d
         LEFT JOIN summary s ON d.day = s.day
ORDER BY d.day DESC;
