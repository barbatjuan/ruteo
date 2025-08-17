import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/healthz')
  health() {
    return { ok: true, time: new Date().toISOString() };
  }
}
