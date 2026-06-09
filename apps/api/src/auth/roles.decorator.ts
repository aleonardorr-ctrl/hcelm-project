import { SetMetadata } from '@nestjs/common';

// Este decorador permite usar @Roles('DIRECTOR') en los controllers
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);