/** npm imports */
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class SdkFinanceTokenResponseDto {
  @Field()
  sdkFinanceTokenAccessToken: string

  @Field()
  sdkFinanceRefreshToken: string
}
