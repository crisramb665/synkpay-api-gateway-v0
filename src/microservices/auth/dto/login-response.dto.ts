/** npm imports */
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class LoginResponseDto {
  @Field()
  apiGatewayAccessToken: string

  @Field()
  apiGatewayRefreshToken: string

  @Field()
  expiresAt: string
}
