import { Resend } from "resend";
import { logger } from "@/lib/logger";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailBatchInput {
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>;
  from?: string;
}

export interface EmailTemplateData {
  appName: string;
  recipientName?: string;
  sharerName?: string;
  blueprintName?: string;
  blueprintDescription?: string;
  permission?: "view" | "edit" | "fork" | "admin";
  blueprintLink?: string;
  expirationDate?: string;
  teamName?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey || apiKey === "" || apiKey.startsWith("your_")) {
        logger.warn("Email service not configured: RESEND_API_KEY not set or is a placeholder");
        this.initialized = false;
        return;
      }

      this.resend = new Resend(apiKey);
      this.initialized = true;
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.initialized = false;
    }
  }

  isConfigured(): boolean {
    return this.initialized && this.resend !== null;
  }

  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      logger.warn("Email service not configured, skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    try {
      const from = input.from || process.env.RESEND_FROM_EMAIL || "noreply@architect-platform.com";

      const data = {
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
      };

      const result = await this.resend!.emails.send(data);

      if (result.error) {
        logger.error("Failed to send email via Resend", {
          error: result.error.message,
          to: input.to,
          subject: input.subject,
        });
        return { success: false, error: result.error.message };
      }

      logger.info("Email sent successfully", {
        messageId: result.data?.id,
        to: input.to,
        subject: input.subject,
      });

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Failed to send email", {
        error: errorMessage,
        to: input.to,
        subject: input.subject,
      });
      return { success: false, error: errorMessage };
    }
  }

  async sendBatchEmails(
    input: SendEmailBatchInput,
  ): Promise<{ success: boolean; failedCount: number; sentCount: number; errors: string[] }> {
    if (!this.isConfigured()) {
      logger.warn("Email service not configured, skipping batch email send");
      return { success: false, failedCount: input.emails.length, sentCount: 0, errors: ["Email service not configured"] };
    }

    const errors: string[] = [];
    let sentCount = 0;
    let failedCount = 0;

    const from = input.from || process.env.RESEND_FROM_EMAIL || "noreply@architect-platform.com";

    for (const email of input.emails) {
      try {
        const result = await this.resend!.emails.send({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
        });

        if (result.error) {
          errors.push(`${email.to}: ${result.error.message}`);
          failedCount++;
        } else {
          sentCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${email.to}: ${errorMessage}`);
        failedCount++;
      }
    }

    logger.info("Batch email send completed", {
      total: input.emails.length,
      sent: sentCount,
      failed: failedCount,
    });

    return {
      success: failedCount === 0,
      sentCount,
      failedCount,
      errors,
    };
  }

  renderBlueprintSharedTemplate(data: EmailTemplateData): string {
    const {
      appName,
      recipientName,
      sharerName,
      blueprintName,
      blueprintDescription,
      permission,
      blueprintLink,
      expirationDate,
    } = data;

    const permissionText = {
      view: "Read-only access",
      edit: "Edit access",
      fork: "Fork access",
      admin: "Admin access",
    }[permission || "view"];
    const expirationText = expirationDate
      ? `<p style="margin: 0 0 16px 0; color: #6b7280;"><strong>Expires:</strong> ${expirationDate}</p>`
      : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blueprint Shared with You</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">
        ${recipientName ? `Hi ${recipientName},` : "Hi,"}
      </h1>
      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        ${sharerName ? `<strong>${sharerName}</strong> has` : "Someone has"} shared a blueprint with you on ${appName}.
      </p>

      <div style="margin: 24px 0; padding: 24px; background-color: #f3f4f6; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">
          ${blueprintName || "Untitled Blueprint"}
        </h2>
        ${blueprintDescription ? `<p style="margin: 0 0 16px 0; color: #6b7280; line-height: 1.6;">${blueprintDescription}</p>` : ""}
        <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Access Level:</strong> ${permissionText}</p>
        ${expirationText}
      </div>

      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        You can view and access the shared blueprint by clicking the button below.
      </p>

      <table style="margin: 0 0 32px 0;">
        <tr>
          <td align="center" style="border-radius: 8px;" bgcolor="#3b82f6">
            <a href="${blueprintLink || "#"}" style="
              display: inline-block;
              padding: 14px 28px;
              color: #ffffff;
              text-decoration: none;
              font-size: 16px;
              font-weight: 600;
              border-radius: 8px;
            " target="_blank">
              View Blueprint
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 14px; word-break: break-all;">
        ${blueprintLink || "#"}
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">

      <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 14px;">
        This is an automated message from ${appName}.
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 14px;">
        If you believe this was sent in error, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  async sendBlueprintSharedEmail(
    to: string | string[],
    data: Omit<EmailTemplateData, "appName">,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "Architect Platform";
    const html = this.renderBlueprintSharedTemplate({ ...data, appName });

    return this.sendEmail({
      to,
      subject: `${data.sharerName || "Someone"} shared a blueprint with you`,
      html,
    });
  }
}

export class EmailServicePublic extends EmailService {}

export const emailService = new EmailServicePublic();
export { EmailService };
