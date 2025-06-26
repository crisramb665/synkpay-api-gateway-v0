/** npm imports */
import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class LogoutResponseDto {
  @Field()
  status: number

  @Field()
  revoked: boolean
}
