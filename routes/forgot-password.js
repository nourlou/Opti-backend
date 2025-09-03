const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// Temporary storage for reset codes
const resetCodes = new Map(); // { email: { code, expiresAt } }

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your SMTP service
  auth: {
    user: 'yosrbencheikh28@gmail.com',
    pass: 'xqzc yhwk kdvi pmdy',
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Error in forgot-password transporter configuration:', error);
  } else {
    console.log('Forgot-password transporter is ready to send emails');
  }
});

// Generate random reset code
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send code for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and store reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Code valid for 1 hour
    
    resetCodes.set(email, { code: resetCode, expiresAt });

    // Send email with reset code
    const mailOptions = {
      from: 'yosrbencheikh28@gmail.com',
      to: email,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset Code</h2>
          <p>You requested a password reset. Use the following code to reset your password:</p>
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 15px 0;">
            <strong>${resetCode}</strong>
          </div>
          <p>This code will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'Reset code sent successfully' });
  } catch (error) {
    console.error('Send reset code error:', error);
    return res.status(500).json({ message: 'Error sending reset code', error: error.message });
  }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const storedData = resetCodes.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'No reset code found for this email' });
    }

    if (new Date() > storedData.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ message: 'Reset code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    return res.status(200).json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    return res.status(500).json({ message: 'Error verifying reset code', error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }

    const storedData = resetCodes.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'No reset code found for this email' });
    }

    if (new Date() > storedData.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ message: 'Reset code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Update password in database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    
    // Remove used reset code
    resetCodes.delete(email);

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;