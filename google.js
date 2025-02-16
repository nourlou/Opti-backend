const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
 
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID:'95644263598-p1ko0g4ds7ko6v6obqkdc38j76ndjmt2.apps.googleusercontent.com',
    clientSecret:'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',
    callbackURL: 'https://7d38-197-21-236-218.ngrok-free.app/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (!user) {
        // Create new user if doesn't exist
        user = new User({
          email: profile.emails[0].value,
          password: 'GOOGLE_AUTH_' + Math.random().toString(36).slice(-8), // Random password for Google users
          nom: '', // Empty as requested
          prenom: '',
          genre:' ',
          date:' ',
          region:' ',
          phone:22222222,
           // Empty as requested
          // Add any other required fields with empty values
        });
        await user.save();
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      return done(null, { user, token });
    } catch (error) {
      return done(error, null);
    }
  }
));
