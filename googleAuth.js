const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User'); // Import the User model
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function setupGoogleAuth(app) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '95644263598-s2g9bi8pl2g59h6og9h65fqmsn72bbje.apps.googleusercontent.com';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
    const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback';
  
    // Google Strategy Setup
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        passReqToCallback: true
    }, async function(req, accessToken, refreshToken, profile, done) {
        try {
            // Check if user exists
            let user = await User.findOne({ email: profile.emails[0].value });
            
            if (!user) {
                // Create new user if doesn't exist
                user = new User({
                    nom: profile.name.givenName,
                    prenom: profile.name.familyName,
                    email: profile.emails[0].value,
                    date: new Date().toISOString(),
                    password: 'GOOGLE_AUTH',
                    phone: 'N/A',
                    region: 'N/A',
                    gender: 'N/A'
                });
                await user.save();
            }
            
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

    // Serialization
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialization
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // Routes
    app.get('/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email']
        })
    );

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login',
            failureFlash: true
        }),
        (req, res) => {
            const token = jwt.sign(
                { id: req.user._id, email: req.user.email },
                process.env.JWT_SECRET || 'yourJWTSecret',
                { expiresIn: '1h' }
            );
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=${token}`);
          }
    );

    // API endpoint for Flutter client
    app.post('/api/google-login', async (req, res) => {
        const { token } = req.body;

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            let user = await User.findOne({ email: payload.email });

            if (!user) {
                user = new User({
                    nom: payload.given_name,
                    prenom: payload.family_name,
                    email: payload.email,
                    date: new Date().toISOString(),
                    password: 'GOOGLE_AUTH',
                    phone: 'N/A',
                    region: 'N/A',
                    gender: 'N/A'
                });
                await user.save();
            }

            const jwtToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET || 'yourJWTSecret',
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                message: 'Google login successful',
                token: jwtToken,
                user: {
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('Error during Google login:', error);
            return res.status(400).json({
                message: 'Invalid Google token',
                error: error.message
            });
        }
    });
}

module.exports = setupGoogleAuth;