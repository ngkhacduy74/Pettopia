import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, Matches } from 'class-validator';

export class GetAllUsersDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @IsPositive()
  limit: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'deactive'])
  status?: 'active' | 'deactive';

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  sort_field?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email_address?: string;

  @IsOptional()
  @IsNumber()
  reward_point?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]+$/, { message: 'Phone number can only contain numbers and +' })
  phone_number?: string;
}

export interface PaginatedUsersResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}