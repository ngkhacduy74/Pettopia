import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppointmentsService } from './appointments.service';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @MessagePattern({ cmd: 'create_appointment' })
  async create(@Payload() createData: any) {
    return this.appointmentsService.create(createData);
  }

  @MessagePattern({ cmd: 'get_all_appointments' })
  async findAll() {
    return this.appointmentsService.findAll();
  }

  @MessagePattern({ cmd: 'get_appointment_by_id' })

  async findById(@Payload() id: string) {
    return this.appointmentsService.findById(id);
  }

  @MessagePattern({ cmd: 'update_appointment' })
  async update(@Payload() data: { id: string; updateData: any }) {
    return this.appointmentsService.update(data.id, data.updateData);
  }

  @MessagePattern({ cmd: 'delete_appointment' })
  async remove(@Payload() id: string) {
    return this.appointmentsService.remove(id);
  }
}
