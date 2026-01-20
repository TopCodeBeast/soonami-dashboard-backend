import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { validateName } from './name-validator';

@ValidatorConstraint({ async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
  validate(name: any, args: ValidationArguments) {
    if (!name) {
      return true; // Let @IsOptional handle required checks
    }
    const result = validateName(name);
    return result.valid;
  }

  defaultMessage(args: ValidationArguments) {
    const name = args.value;
    if (!name) {
      return 'Name is required';
    }
    const result = validateName(name);
    return result.error || 'Invalid name';
  }
}

/**
 * Custom validator decorator for name validation
 * Validates: max 40 chars, alphanumeric + spaces only, no profanity
 */
export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidNameConstraint,
    });
  };
}
