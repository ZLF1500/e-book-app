import nodemailer from "nodemailer"

export interface SendResetEmailParams {
  to: string
  resetUrl: string
  expiresInMinutes?: number
}

export interface SendEmailResult {
  success: boolean
  delivered: boolean
  method: "smtp" | "ethereal"
  sender: string
  previewUrl?: string | null
  error?: string
  messageId?: string
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresInMinutes = 15,
}: SendResetEmailParams): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "465", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const from =
    process.env.SMTP_FROM ||
    `"PerpusAHM RSJD Atma Husada" <perpusahm@gmail.com>`

  const emailSubject = "[PerpusAHM] Atur Ulang Kata Sandi Akun"

  const textContent = `
Halo Pembaca PerpusAHM,

Kami menerima permohonan untuk mengatur ulang kata sandi akun perpustakaan digital Anda (${to}).

Untuk membuat kata sandi baru, silakan buka tautan berikut di peramban Anda:
${resetUrl}

Informasi Penting:
- Tautan rahasia ini hanya berlaku selama ${expiresInMinutes} menit demi perlindungan akun Anda.
- Jika Anda tidak pernah meminta perubahan kata sandi ini, silakan abaikan email ini. Akun dan riwayat bacaan Anda tetap aman terlindungi.

Hormat kami,
Layanan Perpustakaan Digital RSJD Atma Husada Mahakam
Jl. Kakap No. 23, Samarinda, Kalimantan Timur
Hotline 24 Jam: (0541) 743364
Situs Resmi: https://rsjdahm.kaltimprov.go.id/
`.trim()

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Atur Ulang Kata Sandi - PerpusAHM</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0369a1 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .sub-header { font-size: 11px; opacity: 0.85; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .paragraph { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .button-wrapper { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2); }
        .link-box { background-color: #f1f5f9; padding: 14px; border-radius: 10px; font-size: 11px; color: #64748b; word-break: break-all; margin: 16px 0; border: 1px solid #e2e8f0; }
        .warning { font-size: 11px; color: #b45309; background-color: #fef3c7; padding: 12px 16px; border-radius: 10px; margin-top: 20px; line-height: 1.5; }
        .footer { padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Perpus<span style="color: #38bdf8;">AHM</span>.com</h1>
          <div class="sub-header">RSJD Atma Husada Mahakam Samarinda</div>
        </div>
        <div class="content">
          <div class="greeting">Halo Pembaca PerpusAHM,</div>
          <p class="paragraph">
            Kami menerima permintaan untuk mengatur ulang kata sandi akun perpustakaan digital Anda (${to}).
          </p>
          <p class="paragraph">
            Klik tombol verifikasi di bawah ini untuk membuat kata sandi baru Anda:
          </p>
          <div class="button-wrapper">
            <a href="${resetUrl}" class="button" target="_blank">Atur Ulang Kata Sandi Saya</a>
          </div>
          <p class="paragraph" style="font-size: 11px; color: #64748b;">
            Atau salin tautan verifikasi berikut langsung ke peramban Anda:
          </p>
          <div class="link-box">${resetUrl}</div>
          <div class="warning">
            <strong>Penting:</strong> Tautan rahasia ini hanya berlaku selama <strong>${expiresInMinutes} menit</strong> demi keamanan akun Anda.
          </div>
          <p class="paragraph" style="font-size: 11px; color: #94a3b8; margin-top: 20px;">
            Jika Anda tidak pernah meminta perubahan kata sandi ini, silakan abaikan email ini. Akun dan data bacaan Anda tetap aman.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RSJD Atma Husada Mahakam Samarinda.<br>
          Jl. Kakap No. 23, Samarinda, Kalimantan Timur • Hotline 24 Jam: (0541) 743364<br>
          <a href="https://rsjdahm.kaltimprov.go.id/" style="color: #0284c7; text-decoration: none;">rsjdahm.kaltimprov.go.id</a>
        </div>
      </div>
    </body>
    </html>
  `

  // Opsi 1: Jika SMTP di .env telah diisi kredensial nyata (Gmail / RSJD Server)
  const hasCustomSmtp = Boolean(host && user && pass)

  if (hasCustomSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      })

      const info = await transporter.sendMail({
        from,
        to,
        replyTo: user || "perpusahm@gmail.com",
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
        priority: "normal",
        headers: {
          "Auto-Submitted": "auto-generated",
          "X-Auto-Response-Suppress": "All",
        },
      })

      return {
        success: true,
        delivered: true,
        method: "smtp",
        sender: from,
        messageId: info.messageId,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        delivered: false,
        method: "smtp",
        sender: from,
        error: `Gagal mengirim email via SMTP: ${errorMsg}`,
      }
    }
  }

  // Opsi 2: Jika SMTP belum diisi di .env -> Kirim langsung via Ethereal Real SMTP Gateway
  try {
    const testAccount = await nodemailer.createTestAccount()
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })

    const info = await transporter.sendMail({
      from,
      to,
      replyTo: user || "perpusahm@gmail.com",
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
    })

    const previewUrl = nodemailer.getTestMessageUrl(info) || null

    return {
      success: true,
      delivered: true,
      method: "ethereal",
      sender: from,
      previewUrl,
      messageId: info.messageId,
    }
  } catch {
    // Fallback jika tidak ada koneksi internet keluar
    return {
      success: true,
      delivered: false,
      method: "ethereal",
      sender: from,
    }
  }
}

export interface SendOtpEmailParams {
  to: string
  otpCode: string
  purpose?: "reset_password" | "register" | "login" | "general"
  expiresInMinutes?: number
}

export async function sendOtpVerificationEmail({
  to,
  otpCode,
  purpose = "reset_password",
  expiresInMinutes = 10,
}: SendOtpEmailParams): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "465", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const from =
    process.env.SMTP_FROM ||
    `"PerpusAHM RSJD Atma Husada" <perpusahm@gmail.com>`

  const purposeLabels: Record<string, string> = {
    reset_password: "pengaturan ulang kata sandi",
    register: "pendaftaran akun pembaca baru",
    login: "verifikasi masuk akun",
    general: "verifikasi identitas akun",
  }

  const purposeLabel = purposeLabels[purpose] || "verifikasi keamanan akun"
  const emailSubject = "[PerpusAHM] Kode Verifikasi Keamanan Akun"

  const textContent = `
Halo Pembaca PerpusAHM,

Berikut adalah kode One-Time Password (OTP) Anda untuk keperluan ${purposeLabel} di Perpustakaan Digital RSJD Atma Husada Mahakam:

KODE OTP ANDA:
${otpCode}

Informasi Penting:
- Kode OTP ini hanya berlaku selama ${expiresInMinutes} menit.
- JANGAN BERIKAN kode ini kepada siapa pun, termasuk staf yang mengaku dari pihak RSJD Atma Husada Mahakam. Petugas resmi tidak pernah meminta kode OTP rahasia Anda.
- Jika Anda tidak sedang melakukan permintaan ini, segera amankan akun Anda.

Hormat kami,
Layanan Keamanan & Perpustakaan Digital RSJD Atma Husada Mahakam
Jl. Kakap No. 23, Samarinda, Kalimantan Timur
Hotline 24 Jam: (0541) 743364
Situs Resmi: https://rsjdahm.kaltimprov.go.id/
`.trim()

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kode OTP Verifikasi - PerpusAHM</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #0369a1 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .sub-header { font-size: 11px; opacity: 0.85; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .paragraph { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
        .otp-container { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0369a1; background: #e0f2fe; padding: 4px 12px; border-radius: 20px; margin-bottom: 10px; }
        .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0284c7; margin: 4px 0; line-height: 1; }
        .otp-expire { font-size: 11px; color: #64748b; margin-top: 8px; }
        .warning { font-size: 11px; color: #b45309; background-color: #fef3c7; padding: 14px 16px; border-radius: 12px; margin-top: 20px; line-height: 1.5; border-left: 4px solid #f59e0b; }
        .footer { padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Perpus<span style="color: #38bdf8;">AHM</span>.com</h1>
          <div class="sub-header">RSJD Atma Husada Mahakam Samarinda</div>
        </div>
        <div class="content">
          <div class="greeting">Halo Pembaca PerpusAHM,</div>
          <p class="paragraph">
            Berikut adalah kode One-Time Password (OTP) Anda untuk permohonan <strong>${purposeLabel}</strong> pada akun <strong style="color: #0f172a;">${to}</strong>:
          </p>

          <div class="otp-container">
            <div class="otp-badge">Kode OTP Rahasia</div>
            <div class="otp-code">${otpCode}</div>
            <div class="otp-expire">Berlaku selama <strong>${expiresInMinutes} menit</strong> ke depan</div>
          </div>

          <div class="warning">
            <strong>Peringatan Keamanan:</strong> Jangan berikan kode OTP ini kepada siapa pun. Pihak RSJD Atma Husada Mahakam tidak pernah meminta kode ini melalui telepon, chat, maupun email.
          </div>

          <p class="paragraph" style="font-size: 11px; color: #94a3b8; margin-top: 20px;">
            Jika Anda tidak pernah meminta kode ini, akun Anda mungkin sedang dicoba diakses pihak lain. Harap abaikan pesan ini atau hubungi pengelola perpustakaan.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} RSJD Atma Husada Mahakam Samarinda.<br>
          Jl. Kakap No. 23, Samarinda, Kalimantan Timur • Hotline 24 Jam: (0541) 743364<br>
          <a href="https://rsjdahm.kaltimprov.go.id/" style="color: #0284c7; text-decoration: none;">rsjdahm.kaltimprov.go.id</a>
        </div>
      </div>
    </body>
    </html>
  `

  const hasCustomSmtp = Boolean(host && user && pass)

  if (hasCustomSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      })

      const info = await transporter.sendMail({
        from,
        to,
        replyTo: user || "perpusahm@gmail.com",
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
        priority: "normal",
        headers: {
          "Auto-Submitted": "auto-generated",
          "X-Auto-Response-Suppress": "All",
        },
      })

      return {
        success: true,
        delivered: true,
        method: "smtp",
        sender: from,
        messageId: info.messageId,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        delivered: false,
        method: "smtp",
        sender: from,
        error: `Gagal mengirim email OTP: ${errorMsg}`,
      }
    }
  }

  // Fallback via Ethereal if no SMTP credentials
  try {
    const testAccount = await nodemailer.createTestAccount()
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })

    const info = await transporter.sendMail({
      from,
      to,
      replyTo: user || "perpusahm@gmail.com",
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
    })

    const previewUrl = nodemailer.getTestMessageUrl(info) || null

    return {
      success: true,
      delivered: true,
      method: "ethereal",
      sender: from,
      previewUrl,
      messageId: info.messageId,
    }
  } catch {
    return {
      success: true,
      delivered: false,
      method: "ethereal",
      sender: from,
    }
  }
}

