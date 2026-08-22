import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporterPromise;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (env.email.mode === "ethereal") {
        const testAccount = await nodemailer.createTestAccount();
        console.log("\n[E-MAIL LOCAL] Conta Ethereal criada.");
        console.log(`[E-MAIL LOCAL] Usuário: ${testAccount.user}`);
        console.log(
          "[E-MAIL LOCAL] Os e-mails serão apenas de teste e não serão enviados aos destinatários reais.\n",
        );

        return nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      return nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.password,
        },
      });
    })();
  }

  return transporterPromise;
}

const base = (title, body) =>
  `<!doctype html><html><body style="margin:0;background:#fcf1e4;font-family:Arial,sans-serif;color:#3f2818"><div style="max-width:640px;margin:24px auto;background:#fffaf5;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px #5b371822"><div style="padding:28px;text-align:center;background:#b48353;color:white"><h1 style="margin:0">${env.mailFromName}</h1></div><div style="padding:30px"><h2>${title}</h2>${body}</div></div></body></html>`;

export async function sendMail({ to, subject, html }) {
  const transporter = await getTransporter();
  const fromAddress =
    env.email.mode === "ethereal"
      ? env.mailFromAddress || "salao@ethereal.email"
      : env.mailFromAddress;

  const info = await transporter.sendMail({
    from: `${env.mailFromName} <${fromAddress}>`,
    to,
    subject,
    html,
  });

  if (env.email.mode === "ethereal") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n[E-MAIL LOCAL] ${subject}`);
    console.log(`[E-MAIL LOCAL] Para: ${to}`);
    console.log(`[E-MAIL LOCAL] Preview: ${previewUrl}\n`);
  }

  return info;
}

export const sendConfirmationEmail = (u, token) =>
  sendMail({
    to: u.email,
    subject: "Confirme seu cadastro",
    html: base(
      "Confirme seu cadastro",
      `<p>Olá, ${u.name}!</p><p>Seu cadastro foi criado. Clique no botão abaixo para confirmar seu e-mail:</p><p><a href="${env.frontendUrl}/confirmar-email?token=${encodeURIComponent(token)}" style="display:inline-block;padding:12px 18px;background:#6f4526;color:white;border-radius:10px;text-decoration:none">Confirmar cadastro</a></p>`,
    ),
  });

export const sendAppointmentEmail = ({
  to,
  name,
  date,
  time,
  hairdresser,
  service,
  status = "Agendado",
}) =>
  sendMail({
    to,
    subject: `${status} - ${date} às ${time}`,
    html: base(
      status,
      `<p>Olá, ${name}!</p><p><b>Serviço:</b> ${service}<br><b>Cabeleireira:</b> ${hairdresser}<br><b>Data:</b> ${date}<br><b>Horário:</b> ${time}</p><p>Obrigado por escolher nosso salão.</p>`,
    ),
  });

export const sendReviewEmail = ({ to, name }) =>
  sendMail({
    to,
    subject: "Como foi seu atendimento?",
    html: base(
      "Seu atendimento foi concluído 💛",
      `<p>Olá, ${name}!</p><p>Esperamos que tenha gostado do atendimento. Se puder, deixe sua avaliação no Google:</p><p><a href="${env.googleReviewUrl}" style="display:inline-block;padding:12px 18px;background:#6f4526;color:white;border-radius:10px;text-decoration:none">Avaliar no Google</a></p>`,
    ),
  });

export const sendPasswordResetEmail = (u, token) =>
  sendMail({
    to: u.email,
    subject: "Redefinição de senha",
    html: base(
      "Redefinir sua senha",
      `<p>Olá, ${u.name}!</p><p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha:</p><p><a href="${env.frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}" style="display:inline-block;padding:12px 18px;background:#6f4526;color:white;border-radius:10px;text-decoration:none">Redefinir senha</a></p><p style="color:#806c59;font-size:13px">Se você não solicitou esta alteração, ignore este e-mail.</p>`,
    ),
  });
