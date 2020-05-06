var LocalStrategy = require('passport-local').Strategy
var User = require('../models/user')
var bCrypt = require('bcrypt-nodejs')
const request = require('request')

const API_GATEWAY = process.env.API_GATEWAY

function log(message) {
    let data = new Date()
    console.log('****************************************')
    console.log(data.toLocaleString() + ' - ' + message)
    // console.log('****************************************')
}

module.exports = (passport) => {
    passport.use('login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
        (req, email, password, done) => {
            User.findOne({ 'email': email },
                (err, user) => {
                    if (err)
                        return done(err)
                    if (!user) {
                        return done(null, false, req.flash('message', 'E-mail e/ou senha incorretos!'))
                    }
                    if (!isValidPassword(user, password)) {
                        return done(null, false, req.flash('message', 'E-mail e/ou senha incorretos!'))
                    }
                    return done(null, user)
                }
            )

        })
    )
    var isValidPassword = (user, password) => {
        return bCrypt.compareSync(password, user.password)
    }
}