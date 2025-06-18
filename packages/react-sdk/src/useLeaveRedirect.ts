import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSyncAgent } from './useSyncAgent'
import { useUserDms } from './useUserDms'
import { useUserGdms } from './useUserGdms'
import { useUserSpaces } from './useUserSpaces'

export const useLeaveRedirect = (streamId: string) => {
  const navigate = useNavigate()
  const sync = useSyncAgent()
  const { spaceIds } = useUserSpaces()
  const { streamIds: gdmStreamIds } = useUserGdms()
  const { streamIds: dmStreamIds } = useUserDms()
  
  useEffect(() => {
    const unsubscribe = sync.riverConnection.registerView((client) => {
      const onStreamUserLeft = (leftStreamId: string, userId: string) => {
        if (leftStreamId === streamId && userId === sync.userId) {
          if (spaceIds.length > 0) {
            navigate(`/t/${spaceIds[0]}`)
          } else if (gdmStreamIds.length > 0) {
            navigate(`/m/gdm/${gdmStreamIds[0]}`)
          } else if (dmStreamIds.length > 0) {
            navigate(`/m/dm/${dmStreamIds[0]}`)
          } else {
            navigate('/t')
          }
        }
      }
      
      client.on('streamUserLeft', onStreamUserLeft)
      
      return () => {
        client.off('streamUserLeft', onStreamUserLeft)
      }
    })
    
    return unsubscribe
  }, [streamId, sync, navigate, spaceIds, gdmStreamIds, dmStreamIds])
}
