import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import {
  Mail,
  MailDocument,
  MailStatus,
  MailType,
} from 'src/schemas/mail.schema';

@Injectable()
export class MailService {
  constructor(
    @InjectModel(Mail.name)
    private mailModel: Model<MailDocument>,
  ) {}

  async sendMail(to: string, subject: string, html: string, type: MailType) {
    const log = await this.mailModel.create({
      receiver: to,
      subject,
      content: html,
      type,
      status: MailStatus.PENDING,
    });
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject,
        html,
      });

      log.status = MailStatus.SENT;
      log.sent_at = new Date();
      await log.save();
    } catch (error) {
      log.status = MailStatus.FAILED;
      await log.save();
      throw error;
    }
  }
}
