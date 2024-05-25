import { useCallback, useContext, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PanelContext } from '@components/Panel/PanelContext'
import { CHANNEL_INFO_PARAMS_VALUES } from 'routes'
import { useDevice } from 'hooks/useDevice'
import { useAnalytics } from 'hooks/useAnalytics'

export const usePanelActions = () => {
    const { isTouch } = useDevice()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const context = useContext(PanelContext)
    const contextStackId = context?.stackId
    const contextParentRoute = context?.parentRoute
    const isRootPanel = context?.isRootPanel
    const { analytics } = useAnalytics()

    return {
        isStacked: useMemo(() => {
            if (isTouch) {
                return !isRootPanel
            } else {
                return searchParams.get('stacked')
            }
        }, [isRootPanel, isTouch, searchParams]),
        openPanel: useCallback(
            (
                panel: CHANNEL_INFO_PARAMS_VALUES,
                options: {
                    stackId?: string
                    channelId?: string
                    profileId?: string
                } = {},
            ) => {
                const { stackId = contextStackId, ...restOptions } = options

                setSearchParams({
                    panel,
                    stackId,
                    // for desktop, opening a panel from within a panel should
                    // "stack it" allowing the user to go back to the previous panel
                    ...(context.isPanelContext ? { stacked: 'true' } : {}),
                    ...restOptions,
                })
            },
            [context, contextStackId, setSearchParams],
        ),
        closePanel: useCallback(
            (params?: { preventPopStack: boolean }) => {
                const panel = searchParams.get('panel')
                if (panel && analytics) {
                    analytics.track(
                        'close panel',
                        {
                            panel,
                        },
                        () => {
                            console.log('[analytics] close panel', panel)
                        },
                    )
                }
                if (contextParentRoute) {
                    navigate(contextParentRoute)
                } else if ((searchParams.get('stacked') && !params?.preventPopStack) || isTouch) {
                    navigate(-1)
                } else if (searchParams.get('panel')) {
                    searchParams.delete('panel')
                    setSearchParams({ ...searchParams })
                }
            },
            [analytics, contextParentRoute, isTouch, navigate, searchParams, setSearchParams],
        ),

        isPanelOpen: useCallback(
            (panel: CHANNEL_INFO_PARAMS_VALUES) => {
                return searchParams.get('panel') === panel
            },
            [searchParams],
        ),
    }
}
