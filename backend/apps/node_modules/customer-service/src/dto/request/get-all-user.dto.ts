import { IsIn, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

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
}

export interface PaginatedUsersResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}