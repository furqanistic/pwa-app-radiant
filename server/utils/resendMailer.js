import { Resend } from 'resend'

const getResendClient = () => {
  const apiKey = `${process.env.RESEND_API_KEY || ''}`.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  appName = 'CXR Systems',
  brandColor = '#0f172a',
  logoUrl = '',
  subdomain = '',
  rootDomain = 'cxrsystems.com',
} = {}) => {
  const normalizedTo = `${to || ''}`.trim().toLowerCase()
  const normalizedResetUrl = `${resetUrl || ''}`.trim()

  if (!normalizedTo || !normalizedResetUrl) {
    throw new Error('Email recipient and reset URL are required')
  }

  const fromAddress =
    `${process.env.RESEND_FROM_EMAIL || ''}`.trim() ||
    'RadiantAI <onboarding@resend.dev>'

  const resend = getResendClient()
  const safeBrandColor = /^#[0-9A-Fa-f]{6}$/.test(`${brandColor || ''}`.trim())
    ? `${brandColor}`.trim()
    : '#0f172a'
  const normalizedLogoUrl = `${logoUrl || ''}`.trim()
  const normalizedSubdomain = `${subdomain || ''}`.trim().toLowerCase()
  const normalizedRootDomain = `${rootDomain || ''}`.trim().toLowerCase()
  const hasSubdomain = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(normalizedSubdomain)

  await resend.emails.send({
    from: fromAddress,
    to: normalizedTo,
    subject: `Reset your ${appName} password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f8fafc; padding:24px;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:20px; padding:28px; border:1px solid #e2e8f0;">
          ${
            normalizedLogoUrl
              ? `<img src="${normalizedLogoUrl}" alt="${appName}" style="height:40px; width:auto; display:block; margin:0 0 12px;" />`
              : ''
          }
          <p style="font-size:14px; color:#64748b; margin:0 0 10px;">Secure password reset</p>
          <h1 style="font-size:24px; color:#0f172a; margin:0 0 14px;">Reset your password</h1>
          <p style="font-size:15px; color:#334155; line-height:1.6; margin:0 0 22px;">
            We received a request for your ${appName} account. Use the secure button below to choose a new password.
          </p>
          <a href="${normalizedResetUrl}" style="display:inline-block; background:${safeBrandColor}; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 18px; border-radius:12px;">
            Reset Password
          </a>
          ${
            hasSubdomain
              ? `<p style="font-size:13px; color:#334155; margin:16px 0 0; line-height:1.6;">This link is specific to <strong>${normalizedSubdomain}.${normalizedRootDomain}</strong>.</p>`
              : ''
          }
          <p style="font-size:13px; color:#64748b; margin:20px 0 0; line-height:1.6;">
            This link expires soon for security. If you did not request a reset, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  })
}
