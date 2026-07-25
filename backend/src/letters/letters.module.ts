import { Module } from '@nestjs/common';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';

@Module({
  providers: [LettersService],
  controllers: [LettersController],
  exports: [LettersService],
})
export class LettersModule {}
