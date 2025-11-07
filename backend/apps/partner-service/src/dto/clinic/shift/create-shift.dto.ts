import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

export enum ClinicShiftType {
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  EVENING = 'Evening',
}

@ValidatorConstraint({ name: 'isEndTimeGreaterThan', async: false })
export class IsEndTimeGreaterThanConstraint
  implements ValidatorConstraintInterface
{
  validate(end_time: string, args: ValidationArguments) {
    const object = args.object as CreateClinicShiftDto;
    const start_time = object.start_time;

    if (!start_time || !end_time) {
      return true;
    }

    try {
      const [startHour, startMinute] = start_time.split(':').map(Number);
      const [endHour, endMinute] = end_time.split(':').map(Number);

      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;

      return endTotal > startTotal;
    } catch (e) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'end_time phải lớn hơn start_time';
  }
}

export function IsEndTimeGreaterThan(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEndTimeGreaterThanConstraint,
    });
  };
}

export class CreateClinicShiftDto {
  @IsUUID('4', { message: 'clinic_id phải là UUIDv4 hợp lệ' })
  @IsString()
  @IsNotEmpty()
  clinic_id: string;

  @IsEnum(ClinicShiftType, {
    message: `shift phải là một trong các giá trị: ${Object.values(
      ClinicShiftType,
    ).join(', ')}`,
  })
  @IsNotEmpty()
  shift: ClinicShiftType;

  @IsInt({ message: 'max_slot phải là số nguyên' })
  @Min(1, { message: 'max_slot phải lớn hơn 0' })
  @IsNotEmpty()
  max_slot: number;

  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start_time phải theo định dạng HH:mm (24h)',
  })
  @IsNotEmpty()
  start_time: string;

  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end_time phải theo định dạng HH:mm (24h)',
  })
  @IsEndTimeGreaterThan()
  @IsNotEmpty()
  end_time: string;
}
