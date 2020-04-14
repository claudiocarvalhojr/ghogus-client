var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var bCrypt = require('bcrypt-nodejs');

module.exports = (passport) => {

    passport.use('signup', new LocalStrategy({
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        (req, username, password, done) => {

            findOrCreateUser = () => {
                // find a user in Mongo with provided username
                User.findOne({ 'username': username }, (err, user) => {
                    // In case of any error, return using the done method
                    if (err) {
                        console.log('Erro no registro: ' + err);
                        return done(err);
                    }
                    // already exists
                    if (user) {
                        console.log('Já existe usuário com o nome: ' + username);
                        return done(null, false, req.flash('message', 'Usuário já existe'));
                    } else {
                        // if there is no user with that email
                        // create the user
                        var newUser = new User();

                        // set the user's local credentials
                        newUser.username = username;
                        newUser.password = createHash(password);
                        newUser.email = req.param('email');
                        newUser.firstName = req.param('firstName');
                        newUser.lastName = req.param('lastName');

                        // save the user
                        newUser.save((err) => {
                            if (err) {
                                console.log('Erro ao salvar usuário: ' + err);
                                throw err;
                            }
                            console.log('Registro do usuário realizado com sucesso!');
                            return done(null, newUser);
                        });
                    }
                });
            };
            // Delay the execution of findOrCreateUser and execute the method
            // in the next tick of the event loop
            process.nextTick(findOrCreateUser);
        })
    );

    // Generates hash using bCrypt
    var createHash = (password) => {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }

}