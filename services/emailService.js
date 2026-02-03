/**
 * Email service using Nodemailer with Ethereal (test account).
 * In development, creates a test account and logs the preview URL to console.
 */
const nodemailer = require("nodemailer");

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Use Ethereal test account (no real SMTP needed)
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return transporter;
}

/**
 * Send an email. In dev with Ethereal, logs the preview URL to console.
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<{ messageId: string, previewUrl: string }>}
 */
async function sendMail(options) {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: '"Hệ thống QL SV Thực tập" <noreply@example.com>',
    to: options.to,
    subject: options.subject || "Thông báo",
    text: options.text,
    html: options.html || options.text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("\n========== ETHEREAL EMAIL PREVIEW (copy URL to browser) ==========");
    console.log(previewUrl);
    console.log("===================================================================\n");
  }
  return { messageId: info.messageId, previewUrl: previewUrl || null };
}

module.exports = { sendMail, getTransporter };
