/** npm imports */
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class LoginResponseDto {
  @Field()
  accessToken: string

  //TODO Checking if it's totally required to return refresh token
  //TODO from SDK Finance directly on Mutation response

  @Field()
  expiresAt: string
}
