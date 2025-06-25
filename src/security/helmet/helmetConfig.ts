/** npm imports */
import helmet from 'helmet'

export const configureHelmet = (isProd: boolean): ReturnType<typeof helmet> => {
  return helmet({
    crossOriginEmbedderPolicy: isProd,
    crossOriginResourcePolicy: { policy: isProd ? 'same-site' : 'cross-origin' },
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
            scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
            manifestSrc: ["'self'", 'apollo-server-landing-page.cdn.apollographql.com'],
            frameSrc: ["'self'", 'sandbox.embed.apollographql.com'],
          },
        }
      : false, //! We are disabling CSP in development for easier debugging
  })
}
