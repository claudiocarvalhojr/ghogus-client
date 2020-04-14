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

  /* INDEX */
  router.get('/', isNotAuthenticated, (req, res, next) => {
    log('client/index... ')
    res.render('index', {
      title: APP_TITLE, message: req.flash('message')
    })
  })

  /* LOGIN */
  router.post('/login', passport.authenticate('login', {
    // successRedirect: '/home',
    failureRedirect: '/',
    failureFlash: true
  }),
    (req, res) => {
      log('client/login...')
      request.post(API_GATEWAY + '/login', {
        json: {
          'id': req.user._id,
          'user': req.user.username
        }
      }, (error, response, body) => {
        if (error) { return console.log('ERROR: ' + error) }
        if (response.body.auth) {
          req.session.token = response.body.token
          res.redirect('/home')
        }
      })
    }
  );

  /* HOME */
  router.get('/home', isAuthenticated, isTokenValid, (req, res, next) => {
    log('client/home...')
    res.render('home', {
      title: APP_TITLE,
      name: req.user.firstName + ' ' + req.user.lastName
    })
  })

  /* CONTATO */
  router.get('/contato', (req, res, next) => {
    log('client/contact...')
    res.render('contact', {
      title: APP_TITLE,
      name: req.session.user
    })
  })

  /* LOGOUT */
  router.get('/logout', isAuthenticated, (req, res, next) => {
    log('client/logout...')
    request.get(API_GATEWAY + '/logout', (error, result) => {
      if (error) { return console.log('ERROR: ' + error) }
      req.session.token = JSON.parse(result.body).token
      req.logout();
      res.redirect('/');
    })
  })

  /* MY-ACCOUNT */
  router.get('/minha-conta', isAuthenticated, isTokenValid, (req, res, next) => {
    log('client/my-account...')
    request.get(API_GATEWAY + '/clientes?token=' + req.session.token, (error, result) => {
      if (error) { return console.log('ERROR: ' + error) }
      res.render('my-account', {
        title: APP_TITLE,
        docs: JSON.parse(result.body)
      })
    })
  })

  return router
}