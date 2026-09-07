import { Module } from '@nestjs/common'
import { RecurringController } from './recurring.controller.js'
import { RecurringService } from './recurring.service.js'

@Module({ controllers: [RecurringController], providers: [RecurringService] })
export class RecurringModule {}
