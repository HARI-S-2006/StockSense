import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isConfigured = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.isConfigured = true
      console.log('📧 Email service configured with SMTP')
    } else {
      console.log('📧 Email service running in DEVELOPMENT mode - OTPs will be logged to console')
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; devOTP?: string }> {
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'StockSense <noreply@stocksense.com>'

    if (!this.isConfigured || !this.transporter) {
      // Development mode - extract OTP from HTML and return it
      const otpMatch = options.html.match(/(\d{6})/)
      const devOTP = otpMatch ? otpMatch[1] : undefined

      console.log('📧 [DEV MODE] Email would be sent:')
      console.log(`   To: ${options.to}`)
      console.log(`   Subject: ${options.subject}`)
      console.log(`   OTP: ${devOTP || 'Not found in HTML'}`)
      console.log('---')

      return { success: true, devOTP }
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      console.log('📧 Email sent:', info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('📧 Email send failed:', error)
      return { success: false }
    }
  }

  async sendOTPEmail(email: string, otp: string, name: string): Promise<{ success: boolean; devOTP?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">StockSense</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0;">Real-Time Inventory Management</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>You requested a password reset for your StockSense account. Use the following OTP to reset your password:</p>
            <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">StockSense Inventory Management System</p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: 'StockSense - Password Reset OTP',
      html,
      text: `Your StockSense password reset OTP is: ${otp}. Valid for 10 minutes.`,
    })
  }

  async sendWelcomeEmail(email: string, name: string): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to StockSense!</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p>Hi ${name},</p>
            <p>Welcome to StockSense - your real-time inventory management system.</p>
            <p>You can now manage products, track stock movements, handle receipts and deliveries, and monitor inventory levels across multiple warehouses.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Login to StockSense</a>
            </p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: 'Welcome to StockSense!',
      html,
    })
  }
}

export const emailService = new EmailService()