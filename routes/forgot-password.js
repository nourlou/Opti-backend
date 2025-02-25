const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Assurez-vous que le chemin est correct
const router = express.Router();

const resetCodes = new Map(); // Stocke temporairement les codes de réinitialisation

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    pass: process.env.EMAIL_PASS, // Assurez-vous que le mot de passe est stocké dans les variables d'environnement
  },
});

// 📌 Route : Demande de réinitialisation du mot de passe
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Expire après 5 minutes
  resetCodes.set(email, { code: resetCode, expiresAt });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    html: `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reset Password</title>
      </head>
      <body>
        <h1>Password Reset Request</h1>
        <p>Dear ${email},</p>
        <p>Your verification code is: <strong>${resetCode}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      </body>
      </html>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send({ message: 'Error sending email', error });
    }
    res.status(200).send({ message: 'Reset code sent to email' });
  });
});

// 📌 Route : Vérifier le code de réinitialisation
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  const storedData = resetCodes.get(email);

  if (!storedData || storedData.code !== code || Date.now() > storedData.expiresAt) {
    return res.status(400).send({ message: 'Invalid or expired code' });
  }

  res.status(200).send({ message: 'Code verified' });
});

// 📌 Route : Réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
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
