import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    const smtpSecure = this.configService.get('SMTP_SECURE');
    const smtpUser = this.configService.get('SMTP_USER');

    this.logger.log('=== SMTP Configuration ===');
    this.logger.log(`SMTP_HOST: ${smtpHost}`);
    this.logger.log(`SMTP_PORT: ${smtpPort}`);
    this.logger.log(`SMTP_SECURE: ${smtpSecure}`);
    this.logger.log(`SMTP_USER: ${smtpUser}`);
    this.logger.log('========================');

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: smtpSecure === 'true',
      auth: {
        user: smtpUser,
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, companyName: string, companySlug: string) {
    // Build URL with company subdomain
    const baseDomain = this.configService.get('BASE_DOMAIN') || 'localhost:3000';
    const verificationUrl = baseDomain.includes('localhost')
      ? `http://localhost:3000/verify-email?token=${token}`
      : `https://${companySlug}.${baseDomain}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: `Verifica tu cuenta - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h1 style="color: #1976d2; margin-top: 0;">Bienvenido a ${companyName}</h1>
            <p style="font-size: 16px;">Gracias por registrarte. Por favor verifica tu dirección de email haciendo click en el siguiente botón:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; 
                        padding: 15px 30px; 
                        background-color: #1976d2; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 5px;
                        font-weight: bold;
                        font-size: 16px;">
                Verificar Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #999;">
              <strong>Nota:</strong> Este enlace expirará en 24 horas.
            </p>
            <p style="font-size: 12px; color: #999;">
              Si no creaste esta cuenta, puedes ignorar este email.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    // Para implementación futura
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Recuperación de Contraseña',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de Contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h1 style="color: #1976d2; margin-top: 0;">Recuperación de Contraseña</h1>
            <p style="font-size: 16px;">Has solicitado restablecer tu contraseña. Haz click en el siguiente botón:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; 
                        padding: 15px 30px; 
                        background-color: #1976d2; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 5px;
                        font-weight: bold;
                        font-size: 16px;">
                Restablecer Contraseña
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #999;">
              <strong>Nota:</strong> Este enlace expirará en 1 hora.
            </p>
            <p style="font-size: 12px; color: #999;">
              Si no solicitaste este cambio, ignora este email.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }
}
