/** npm imports */
import { readFileSync } from 'fs'
import { join } from 'path'

export const getHttpsOptions = (enableHttps: boolean): { key: Buffer; cert: Buffer } | undefined => {
  if (!enableHttps) return undefined

  const certPath = join(process.cwd(), 'cert', 'cert.pem')
  const keyPath = join(process.cwd(), 'cert', 'key.pem')

  return { key: readFileSync(keyPath), cert: readFileSync(certPath) }
}
