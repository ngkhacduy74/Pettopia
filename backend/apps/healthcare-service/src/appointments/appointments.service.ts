import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentsRepository } from './repositories/appointments.repositories';
import { Appointment } from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(private readonly appointmentsRepository: AppointmentsRepository) {}

  async create(data: Partial<Appointment>): Promise<Appointment> {
    return this.appointmentsRepository.create(data);
  }

  async findAll(): Promise<Appointment[]> {
    return this.appointmentsRepository.findAll();
  }

  async findById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) throw new NotFoundException(`Appointment with id ${id} not found`);
    return appointment;
  }

  async update(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const updated = await this.appointmentsRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Appointment with id ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.appointmentsRepository.remove(id);
    if (!result) throw new NotFoundException(`Appointment with id ${id} not found`);
    return { message: 'Appointment deleted successfully' };
  }
}
