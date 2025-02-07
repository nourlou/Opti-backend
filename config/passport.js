const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  User.findOne({ email: profile.emails[0].value }).then(user => {
    if (user) {
      done(null, user);
    } else {
      const newUser = new User({
        nom: profile.name.givenName,
        prenom: profile.name.familyName,
        email: profile.emails[0].value,
        date: new Date().toISOString(),
        password: '',
        phone: '',
        region: '',
        gender: '',
      });

      newUser.save().then(() => done(null, newUser));
    }
  });
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_SECRET_KEY,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  User.findOne({ accountId: profile.id }).then(user => {
    if (user) {
      done(null, user);
    } else {
      const newUser = new User({
        accountId: profile.id,
        name: profile.displayName,
        provider: 'facebook',
      });

      newUser.save().then(() => done(null, newUser));
    }
  });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;