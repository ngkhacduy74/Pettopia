import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../schemas/appointment.schema';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(data: Partial<Appointment>): Promise<Appointment> {
    return new this.appointmentModel(data).save();
  }

  async findAll(): Promise<Appointment[]> {
    return this.appointmentModel.find().sort({ created_at: -1 }).exec();
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.appointmentModel.findById(id).exec();
  }

  async update(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    return this.appointmentModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async remove(id: string): Promise<Appointment | null> {
    return this.appointmentModel.findByIdAndDelete(id).exec();
  }
}
