import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { ChatModule } from './chat/chat.module';
import { NotesModule } from './notes/notes.module';
import { LettersModule } from './letters/letters.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { LogsModule } from './logs/logs.module';
import { SearchController } from './search.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'storage'),
      serveRoot: '/storage',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FilesModule,
    ChatModule,
    NotesModule,
    LettersModule,
    AnnouncementsModule,
    LogsModule,
  ],
  controllers: [SearchController],
})
export class AppModule {}
