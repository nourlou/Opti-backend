const express = require('express');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const router = express.Router();



// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your SMTP service
  auth: {
    user: 'yosrbencheikh28@gmail.com',
    pass: 'xqzc yhwk kdvi pmdy',
  },
  debug: true, // Show debug output
  logger: true
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Error in transporter configuration:', error);
  } else {
    console.log('Transporter is ready to send emails');
  }
});

const resetCodes = new Map();

// Email setup

transporter.verify((error, success) => {
    if (error) {
      console.log('Error in transporter configuration:', error);
    } else {
      console.log('Transporter is ready to send emails');
    }
  });
  

// Forgot Password Route - Send Code
router.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  resetCodes.set(email, { code: resetCode, expiresAt });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Your email styles here */
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="email-body">
            <p>Dear ${email},</p>
            <p>Your verification code is: ${resetCode}</p>
            <p>This code will expire in 5 minutes.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send({ message: 'Error sending email', error });
    }
    res.status(200).send({ message: 'Reset code sent to email' });
  });
});

// Verify Code Route
router.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  const storedData = resetCodes.get(email);

  if (!storedData || storedData.code !== code || Date.now() > storedData.expiresAt) {
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  res.status(200).send({ message: 'Code verified' });
});

// Reset Password Route
router.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const storedData = resetCodes.get(email);

  if (!storedData || storedData.code !== code || Date.now() > storedData.expiresAt) {
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    resetCodes.delete(email);
    res.status(200).send({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error resetting password' });
  }
});

module.exports = router;