DO $$
    DECLARE

        suffix CHAR(2);
        i INT;
        numPartitions INT;

    BEGIN

        SELECT num_partitions FROM settings WHERE single_row_key IS TRUE INTO numPartitions;

        FOR i IN 0.. numPartitions LOOP
                suffix = LPAD(TO_HEX(i), 2, '0');

                -- Media streams
                EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ADD COLUMN IF NOT EXISTS snapshot BYTEA;';
                EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ALTER COLUMN snapshot SET STORAGE EXTERNAL;';
                EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' ADD COLUMN IF NOT EXISTS snapshot BYTEA;';
                EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' ALTER COLUMN snapshot SET STORAGE EXTERNAL;';

                -- Regular streams
                EXECUTE 'ALTER TABLE miniblocks_r' || suffix || ' ADD COLUMN IF NOT EXISTS snapshot BYTEA;';
                EXECUTE 'ALTER TABLE miniblocks_r' || suffix || ' ALTER COLUMN snapshot SET STORAGE EXTERNAL;';
                EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' ADD COLUMN IF NOT EXISTS snapshot BYTEA;';
                EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' ALTER COLUMN snapshot SET STORAGE EXTERNAL;';
            END LOOP;
    END;
$$;