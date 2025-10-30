import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @MessagePattern({ cmd: 'createAppointment' })
  async createAppointment(
    @Payload() data: { data: CreateAppointmentDto; user_id: string },
  ): Promise<any> {
    try {
      console.log('oáidoasd', data);
      const result = await this.appointmentService.createAppointment(
        data.data,
        data.user_id,
      );
      return {
        message: 'Appointment created successfully',
        data: result,
      };
    } catch (err) {
      handleRpcError('AppointmentController.createAppointment', err);
    }
  }
}
