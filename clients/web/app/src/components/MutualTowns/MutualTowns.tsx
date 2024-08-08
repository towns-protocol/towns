import React, { useCallback, useMemo } from 'react'
import { useMemberOf, useMyUserId, useTownsContext } from 'use-towns-client'
import { Box, Heading, Stack, Text } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

export const MutualTowns = (props: { userId: string | undefined; max?: number }) => {
    const { userId, max = 5 } = props
    const myUserId = useMyUserId()
    const memberOf = useMemberOf(userId)
    const { spaces } = useTownsContext()

    const { mutualTowns, showMoreNum, numMutualTowns } = useMemo(() => {
        const all = spaces.filter((s) => (memberOf ? s.id in memberOf : false))
        const mutualTowns = all.slice(0, all.length <= max ? all.length : max - 1)
        const showMoreNum = all.length - mutualTowns.length
        return { mutualTowns, showMoreNum, numMutualTowns: all.length }
    }, [max, memberOf, spaces])

    const membersText = () => {
        if (numMutualTowns > 1) {
            if (userId === myUserId) {
                return `Member of ${numMutualTowns} towns`
            }
            return `${numMutualTowns} mutual towns`
        } else if (mutualTowns && numMutualTowns === 1) {
            return `Member of ${mutualTowns[0]?.name}`
        } else {
            return ''
        }
    }

    const { openPanel } = usePanelActions()
    const onClickMutualTowns = useCallback(() => {
        openPanel('mutual-towns', { profileId: userId })
    }, [openPanel, userId])

    if (!mutualTowns) {
        return null
    }

    return (
        <Stack horizontal gap="sm" alignItems="center" width="100%">
            <Stack horizontal gap="xs" alignItems="center">
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
                {showMoreNum > 0 && (
                    <React.Fragment key="more">
                        <Box insetLeft="sm" paddingLeft="xs" onClick={onClickMutualTowns}>
                            <Box
                                centerContent
                                position="relative"
                                width="x4"
                                height="x4"
                                background="level1"
                                border="strongFaint"
                                rounded="sm"
                                tooltip={`+${showMoreNum} more`}
                                cursor="pointer"
                            >
                                <Heading level={4} color="gray2" fontWeight="medium">
                                    +{showMoreNum}
                                </Heading>
                            </Box>
                        </Box>
                    </React.Fragment>
                )}
            </Stack>
            <Box cursor="pointer" onClick={onClickMutualTowns}>
                <Text truncate size="md" color="gray2" fontWeight="medium">
                    {membersText()}
                </Text>
            </Box>
        </Stack>
    )
}
