import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF } from '../guard/csrf.guard';

export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);
