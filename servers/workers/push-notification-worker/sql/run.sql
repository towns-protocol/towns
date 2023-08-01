-- for debugging. Run any sql statement.
--drop table if exists NotificationSettings;
-- drop table if exists UserSettings;
SELECT
      DISTINCT c.UserId AS userId,
      'users to notify' AS info
    FROM
      UserSettingsSpace s INNER JOIN UserSettingsChannel c
      ON s.SpaceId = c.SpaceId AND s.UserId = c.UserId
    WHERE
      s.SpaceId = '!spaceId-1' AND
      c.ChannelId = '!channelId-1' AND
      (
        c.ChannelMute = 'unmuted' OR
        (
          s.SpaceMute <> 'muted' AND
          c.ChannelMute <> 'muted'
        )
      );
