const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetCodeEmail = (email, resetCode) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Code',
    html: `<p>Your reset code is: ${resetCode}</p>`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendResetCodeEmail };