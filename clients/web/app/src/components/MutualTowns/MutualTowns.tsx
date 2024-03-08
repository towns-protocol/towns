import React, { useMemo } from 'react'
import { LookupUser, useMyUserId, useTownsContext } from 'use-towns-client'
import { Box, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'

export const MutualTowns = (props: { user: LookupUser }) => {
    const myUserId = useMyUserId()
    const { user } = props
    const { spaces } = useTownsContext()
    const memberOf = useMemo(() => {
        const memberOfIds = Object.keys(user?.memberOf ?? [])
        return memberOfIds?.length
            ? memberOfIds.map((spaceId) => spaces.find((f) => f.id === spaceId))
            : undefined
    }, [spaces, user])

    const membersText = () => {
        if (memberOf && memberOf.length > 1) {
            if (user.userId === myUserId) {
                return `Member of ${memberOf.length} towns`
            }
            return `${memberOf.length} mutual towns`
        } else if (memberOf && memberOf.length === 1) {
            return `Member of ${memberOf[0]?.name}`
        } else {
            return ''
        }
    }

    if (!memberOf) {
        return null
    }

    return (
        <Stack horizontal gap="xs" alignItems="center" width="100%">
            {memberOf.filter(notUndefined).map((s) => (
                <React.Fragment key={s.id}>
                    <Box insetLeft="sm" paddingLeft="xs">
                        <SpaceIcon
                            background="level1"
                            border="strongFaint"
                            rounded="sm"
                            letterFontSize="sm"
                            width="x4"
                            height="x4"
                            spaceId={s?.id}
                            firstLetterOfSpaceName={s?.name[0]}
                            overrideBorderRadius="xs"
                            variant={ImageVariants.thumbnail50}
                            fadeIn={false}
                            tooltip={s?.name}
                        />
                    </Box>
                </React.Fragment>
            ))}
            <Text truncate size="md" color="gray2" fontWeight="medium">
                {membersText()}
            </Text>
        </Stack>
    )
}
