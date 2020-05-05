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
                    } else {
                        if (req.cookies.sessionId !== undefined) {
                            console.log('1) sessionId: ' + req.cookies.sessionId)
                            let sessionId = req.cookies.sessionId
                            let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                            log('get/cart/search...')
                            request.get(API_GATEWAY + '/cart/search/' + JSON.stringify(findCart), (error, result) => {
                                if (error) { return console.log('get/cart/search/error: ' + error) }
                                if (result.statusCode == 200) {
                                    let cart = JSON.parse(result.body)[0]
                                    if (cart.products.length == 0)
                                        cart = null
                                    // goCart(req, res, cart, null)
                                    console.log('2) cart: ' + JSON.stringify(cart))
                                }
                            })
                                        }
                        return done(null, user)
                    }
                }
            )

        })
    )
    var isValidPassword = (user, password) => {
        return bCrypt.compareSync(password, user.password)
    }
}