import React from 'react'
import { useParams } from 'react-router'
import { useSpaceSettingsStore } from 'store/spaceSettingsStore'
import { Avatar, Box, Button, Icon, Paragraph, Stack, TextField } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { shortAddress } from 'ui/utils/utils'
const colors = [
    vars.color.background.level3,
    vars.color.tone.positive,
    vars.color.tone.negative,
    vars.color.tone.accent,
    vars.color.tone.cta1,
    vars.color.tone.cta2,
]

export const RoleSettingsDisplay = () => {
    const { role: roleId = '' } = useParams()

    const role = useSpaceSettingsStore((state) => state.space?.roles.find((r) => r.id === roleId))
    const setRoleName = useSpaceSettingsStore((state) => state.setRoleName)
    const setRoleColor = useSpaceSettingsStore((state) => state.setRoleColor)

    if (!role) {
        return <>{`role doesn't exist`}</>
    }

    return (
        <Stack gap="lg" maxWidth="700">
            <Stack gap>
                <Paragraph strong> Role name</Paragraph>
                <TextField
                    background="level2"
                    placeholder="Role name"
                    value={role.name}
                    onChange={(e) => setRoleName(roleId, e.target.value)}
                />
            </Stack>
            <Stack gap>
                <Paragraph strong>Color</Paragraph>
                <Stack horizontal gap="sm">
                    {Object.keys(colors).map((c) => (
                        <Button
                            aspectRatio="1/1"
                            size="button_sm"
                            style={{
                                background: colors[c as keyof typeof colors] as string,
                            }}
                            key={c}
                            onClick={() => setRoleColor(roleId, c)}
                        >
                            {role.color === c && <Icon type="check" />}
                        </Button>
                    ))}
                </Stack>
            </Stack>

            <Stack gap>
                <Paragraph strong>Preview</Paragraph>
                <Stack centerContent alignSelf="start" gap="paragraph" fontSize="md">
                    <Stack>
                        <Avatar src="/placeholders/nft_17.png" size="avatar_lg" />
                    </Stack>
                    <Paragraph color="gray1">benrbn.etc</Paragraph>
                    <Paragraph color="gray2">
                        {shortAddress(`0x01234567890efefefeefefefefefefefefefefef`)}
                    </Paragraph>
                    <Box
                        style={{ background: colors[parseInt(role.color)] }}
                        padding="sm"
                        rounded="sm"
                    >
                        <Paragraph>{role.name}</Paragraph>
                    </Box>
                </Stack>
            </Stack>
        </Stack>
    )
}
