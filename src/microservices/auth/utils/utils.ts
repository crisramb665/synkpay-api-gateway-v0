import { createHash } from 'crypto'

export const hashJwt = (jwt: string) => createHash('sha256').update(jwt).digest('hex')
