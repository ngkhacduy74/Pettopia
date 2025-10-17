import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserToken = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    console.log('okaoias', user);
    if (!data) return user;
    return user ? user[data] : undefined;
  },
);
