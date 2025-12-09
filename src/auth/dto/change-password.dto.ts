import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  @MinLength(6, { message: 'Current password must be at least 6 characters long' })
  oldPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}