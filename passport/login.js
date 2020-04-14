var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var bCrypt = require('bcrypt-nodejs');

module.exports = (passport) => {

    passport.use('login', new LocalStrategy({
        passReqToCallback: true
    },
        (req, username, password, done) => {
            // check in mongo if a user with username exists or not
            User.findOne({ 'username': username },
                (err, user) => {
                    // In case of any error, return using the done method
                    if (err)
                        return done(err);
                    // Username does not exist, log the error and redirect back
                    if (!user) {
                        // console.log('MESSAGE: Não encontrado o usuário ' + username);
                        // return done(null, false, req.flash('message', 'Usuário não encontrado.'));
                        // return done(null, false, req.flash('message', 'Não encontrado o usuário ' + username));
                        return done(null, false, req.flash('message', 'Usuário e/ou senha incorretos!'));
                    }
                    // User exists but wrong password, log the error 
                    if (!isValidPassword(user, password)) {
                        // console.log('MESSAGE: Senha inválida');
                        // return done(null, false, req.flash('message', 'Senha inválida')); // redirect back to login page
                        return done(null, false, req.flash('message', 'Usuário e/ou senha incorretos!')); // redirect back to login page
                    }
                    // User and password both match, return user from done method
                    // which will be treated like success
                    return done(null, user);
                }
            );

        })
    );

    var isValidPassword = (user, password) => {
        return bCrypt.compareSync(password, user.password);
    }

}