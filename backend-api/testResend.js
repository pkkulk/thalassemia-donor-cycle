import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dattajibhale.app@gmail.com",
    pass: "tvab mvam elrb sdfr",
  },
});

await transporter.sendMail({
  from: '"Blood Bank" <dattajibhale.app@gmail.com>',
  to: "prathmeshkulkarni312@gmail.com",
  subject: "Test Email from Supabase Project",
  text: "This is a test email to confirm Gmail SMTP is working!",
});

console.log("✅ Email sent!");
