/** npm imports */
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class LoginResponseDto {
  @Field()
  status: number

  @Field()
  accessToken: string

  @Field()
  refreshToken: string

  @Field()
  expiresAt: string
}
