with space_created AS (SELECT block_time,
                              tx_hash,
                              substring(topic1 FROM 13)    AS space_owner,
                              bytearray_to_uint256(topic2) AS space_owner_token_id,
                              substring(topic3 from 13)    AS space_address
                       FROM base.logs
                       -- SpaceFactory
                       WHERE contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
                         -- SpaceCreated(address,uint256,address)
                         AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
                         AND block_time > cast('2024-05-01' AS timestamp)),

     member_added AS (SELECT DISTINCT contract_address             AS space_address,
                                      substring(topic1 FROM 13)    AS space_member_address,
                                      bytearray_to_uint256(topic2) AS space_member_token_id,
                                      base.logs.tx_hash,
                                      space_owner
                      FROM space_created
                               INNER JOIN base.logs ON space_created.space_address = base.logs.contract_address
                      -- MembershipTokenIssued(address,uint256)
                      WHERE base.logs.topic0 = 0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576),

     spaces_with_num_members AS (SELECT space_address, COUNT(member_added.space_member_address) AS num_memberships
                                 FROM member_added
                                 GROUP BY member_added.space_address, space_owner),

-- TODO: make sure only specific function calls are included
     space_traces AS (SELECT *
                      FROM spaces_with_num_members
                               INNER JOIN base.traces ON spaces_with_num_members.space_address = base.traces.to
                      WHERE success = true
                        AND value > 0),

-- TODO: make sure only specific function calls are included
     space_transactions AS (SELECT *
                            FROM spaces_with_num_members
                                     INNER JOIN base.transactions
                                                ON spaces_with_num_members.space_address = base.transactions.to
                            WHERE success = true
                              AND value > 0),

     space_payments AS (SELECT space_address, block_time, value
                        FROM space_traces
                        UNION ALL
                        SELECT space_address, block_time, value
                        FROM space_transactions),

     summary as (select date_trunc('day', block_time) as day, SUM (COALESCE (value, 0)) / 1e18 as daily_revenue
from space_payments
group by 1
    ),
    days AS
    (
select cast (day as timestamp) as day
from unnest(sequence (date ('2024-05-30'), cast (now() as date), interval '1' day)) as t(day) -- "2024-06-13"
    )

select d.day,
       s.daily_revenue as              daily_revenue,
       sum(coalesce(daily_revenue, 0)) over (order by d.day) as total_revenue
from days d
         left join summary s on d.day = s.day
order by 1 desc
