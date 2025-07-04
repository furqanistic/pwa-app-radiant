import dotenv from 'dotenv'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.js'
dotenv.config()

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${
        process.env.NODE_ENV === 'production'
          ? process.env.SERVER_URL
          : 'http://localhost:8800'
      }/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          // User exists, update last login and return
          user.lastLogin = new Date()
          await user.save({ validateBeforeSave: false })
          return done(null, user)
        }

        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value })

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id
          user.avatar = profile.photos?.[0]?.value
          user.authProvider = user.authProvider === 'local' ? 'local' : 'google'
          user.lastLogin = new Date()
          await user.save({ validateBeforeSave: false })
          return done(null, user)
        }

        // Create new user
        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos?.[0]?.value,
          authProvider: 'google',
          lastLogin: new Date(),
          // No password field for Google users
        })

        return done(null, newUser)
      } catch (error) {
        console.error('Google OAuth error:', error)
        return done(error, null)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user._id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport
