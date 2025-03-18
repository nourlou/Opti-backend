const nodemailer = require('nodemailer');

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  service: 'gmail', // Ou un autre service comme 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER || 'yosrbencheikh28@gmail.com',
    pass: process.env.EMAIL_PASS || 'xqzc yhwk kdvi pmdy'
  }
});

// Fonction pour envoyer un email de bienvenue avec les credentials
const sendWelcomeEmail = async (optician, plainPassword) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'votre_email@gmail.com',
      to: optician.email,
      subject: 'Bienvenue - Vos informations de connexion',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 5px;">
          <h2 style="color: #4a86e8;">Bienvenue ${optician.prenom} ${optician.nom}!</h2>
          <p>Votre compte a été créé avec succès. Voici vos informations de connexion:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${optician.email}</p>
            <p><strong>Mot de passe:</strong> ${plainPassword}</p> <!-- Utiliser plainPassword ici -->
          </div>
          <p>Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
          <p>Pour vous connecter, veuillez visiter notre plateforme et utiliser les informations ci-dessus.</p>
          <p>Cordialement,<br>L'équipe OptiApp</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail
};