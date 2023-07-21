export function printDbResultInfo(message: string, info: D1Result<unknown>) {
  console.log(
    message,
    'success:',
    info.success,
    'meta:',
    info.meta,
    'results:',
    info.results,
  )
}
