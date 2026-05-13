import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { CalculationsModule } from '../calculations/calculations.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [CalculationsModule, GoalsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
