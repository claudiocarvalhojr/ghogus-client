const express = require('express')
const request = require('request')
const router = express.Router()

const APP_TITLE = process.env.APP_TITLE
const API_GATEWAY = process.env.API_GATEWAY

var isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated())
        return next();
    res.redirect('/');
}

var isNotAuthenticated = (req, res, next) => {
    // log('client/isNotTokenValid...')
    if (!req.isAuthenticated())
        return next();
    res.redirect('/home');
}

var isTokenValid = (req, res, next) => {
    // log('client/isTokenValid...')
    request.get(API_GATEWAY + '/check?token=' + req.session.token, (error, result) => {
        if (error) { return console.log('ERROR: ' + error) }
        if (JSON.parse(result.body).auth) { return next() }
        // req.session.token = null
        // req.logout();
        // res.redirect('/')
        res.redirect('/logout')
    })
}

function log(message) {
    var data = new Date()
    console.log('****************************************')
    console.log(data.toLocaleDateString() + ' ' + data.toLocaleTimeString() + ' - ' + message)
    // console.log('****************************************')
}

module.exports = (passport) => {

    router.get('/', (req, res) => {
        log('client/register... ')
        res.render('index', { 
            page: 'register',
            title: APP_TITLE, 
            message: req.flash('message') 
        });
    });

	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash: true
    }));
    
    return router
}