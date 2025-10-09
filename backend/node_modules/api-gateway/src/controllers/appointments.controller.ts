import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    @Inject('HEALTHCARE_SERVICE') private readonly appointmentsClient: ClientProxy,
  ) {}

  // POST /appointments
  @Post()
  async create(@Body() createData: any) {
    return firstValueFrom(
      this.appointmentsClient.send({ cmd: 'create_appointment' }, createData),
    );
  }

  // GET /appointments
  @Get()
  async findAll() {
    return firstValueFrom(
      this.appointmentsClient.send({ cmd: 'get_all_appointments' }, {}),
    );
  }

  // GET /appointments/:id
  @Get(':id')
  async findById(@Param('id') id: string) {
    return firstValueFrom(
      this.appointmentsClient.send({ cmd: 'get_appointment_by_id' }, id),
    );
  }

  // PUT /appointments/:id
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return firstValueFrom(
      this.appointmentsClient.send(
        { cmd: 'update_appointment' },
        { id, updateData },
      ),
    );
  }

  // DELETE /appointments/:id
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.appointmentsClient.send({ cmd: 'delete_appointment' }, id),
    );
  }
}
