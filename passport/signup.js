let LocalStrategy = require('passport-local').Strategy
let User = require('../models/user')
let bCrypt = require('bcrypt-nodejs')

module.exports = (passport) => {
    passport.use('signup', new LocalStrategy({
        usernameField: 'email',
        // passwordField: 'password',
        passReqToCallback: true
    },
        (req, email, password, done) => {
            findOrCreateUser = () => {
                User.findOne({ 'email': email }, (err, user) => {
                    if (err) {
                        return done(err, req.flash('message', 'Erro ao tentar criar o usuário!'))
                    }
                    if (user) {
                        return done(null, false, req.flash('message', 'Este e-mail já esta sendo utilizado!'))
                    } else {
                        let newUser = new User()
                        let registrationDate = new Date()
                        newUser.email = email
                        newUser.password = createHash(password)
                        newUser.birthDate = req.body.birthDate
                        newUser.phoneNumber = req.body.phoneNumber
                        newUser.firstName = req.body.firstName
                        newUser.lastName = req.body.lastName
                        newUser.registrationDate = registrationDate.toLocaleString()
                        newUser.changeDate = registrationDate.toLocaleString()
                        // newUser.cpfCnpj = null
                        // newUser.typePerson = null
                        // newUser.adresses = null
                        newUser.save((err) => {
                            if (err) {
                                throw err
                            }
                            return done(null, newUser, req.flash('message', 'Usuário cadastrado com sucesso!'))
                        })
                    }
                })
            }
            process.nextTick(findOrCreateUser)
        })
    )
    let createHash = (password) => {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null)
    }
}