import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { PlacesController } from './places.controller';
import { GeocodeController } from './geocode.controller';
import { RoutesController } from './routes.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env')],
    }),
  ],
  controllers: [AppController, PlacesController, GeocodeController, RoutesController],
  providers: [],
})
export class AppModule {}
