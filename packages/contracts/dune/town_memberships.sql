-- Daily town membership growth using materialized tables  
WITH member_added AS (SELECT town_address   AS town,
                             block_time,
                             member_address AS recipient,
                             token_id       AS tokenid
                      FROM dune.towns_protocol.result_membership_subscriptions
                      WHERE event_type = 'mint'
                        AND block_time > CAST('2024-05-01' AS timestamp)),
     summary as (select date_trunc('day', block_time) as day, count (*) as member_added
from member_added c
group by 1
    ),
    days AS
    (
select cast (day as timestamp) as day
from unnest(sequence (date ('2024-05-30'), cast (now() as date), interval '1' day)) as t(day)
    )
select d.day,
       s.member_added as              daily_members_added,
       sum(coalesce(member_added, 0)) over (order by d.day) as total_members_added
from days d
         left join summary s on d.day = s.day
order by 1 desc
