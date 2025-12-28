import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MeController } from './me.controller';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [StoreModule],
  providers: [UsersService],
  controllers: [UsersController, MeController]
})
export class UsersModule { }
