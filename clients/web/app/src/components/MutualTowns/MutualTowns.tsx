import React, { useMemo } from 'react'
import { useMemberOf, useMyUserId, useTownsContext } from 'use-towns-client'
import { Box, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'

export const MutualTowns = (props: { userId: string | undefined }) => {
    const { userId } = props
    const myUserId = useMyUserId()
    const memberOf = useMemberOf(userId)
    const { spaces } = useTownsContext()

    const mutualTowns = useMemo(() => {
        return spaces.filter((s) => (memberOf ? s.id in memberOf : false))
    }, [memberOf, spaces])

    const membersText = () => {
        if (mutualTowns && mutualTowns.length > 1) {
            if (userId === myUserId) {
                return `Member of ${mutualTowns.length} towns`
            }
            return `${mutualTowns.length} mutual towns`
        } else if (mutualTowns && mutualTowns.length === 1) {
            return `Member of ${mutualTowns[0]?.name}`
        } else {
            return ''
        }
    }

    if (!mutualTowns) {
        return null
    }

    return (
        <Stack horizontal gap="xs" alignItems="center" width="100%">
            {mutualTowns.filter(notUndefined).map((s) => (
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
