var express = require('express')
var session = require('express-session')
var request = require('request')
var router = express.Router()

const apigateway = 'http://localhost:3000'
const appTitle = 'Reference Store'

router.use(session({
  secret: '2C44-4D44-WppQ38S',
  resave: true,
  saveUninitialized: true
}))

/* INDEX */
router.get('/', isNotAuthenticated, function (req, res, next) {
  console.log('client/index...')
  res.render('index', {
    title: appTitle
  })
})

/* HOME */
router.get('/home', isAuthenticated, function (req, res, next) {
  console.log('client get/home...')
  res.render('home', {
    title: appTitle,
    name: req.session.user
  })
})

/* COONTATO */
router.get('/contato', function (req, res, next) {
  console.log('client/contact...')
  res.render('contact', {
    title: appTitle,
    name: req.session.user
  })
})

/* CLIENTES */
router.get('/clientes', isAuthenticated, function (req, res, next) {
  console.log('client/customers...')
  request.get(apigateway + '/clientes?token=' + req.session.token, (err, result) => {
    if (err) { return console.log(err) }
    res.render('customers', {
      title: appTitle,
      docs: JSON.parse(result.body)
    })
  })
})

/* LOGIN */
router.post('/home', (req, res, next) => {
  console.log('client post/home...')
  let user = req.body.user
  let pass = req.body.pass
  request.post(apigateway + '/login', {
    json: {
      'user': user,
      'pass': pass
    }
  }, (err, response, body) => {
    if (err) { return console.log(err) }
    req.session.token = response.body.token
    req.session.user = response.body.user
    if (response.body.auth) {
      return res.redirect('/home')
    }
    res.redirect('/')
  })
})

function isNotAuthenticated(req, res, next) {
  console.log('\nisNotAuthentication...')
  request.get(apigateway + '/check?token=' + req.session.token, (err, result) => {
    if (err) { return console.log(err) }
    if (!JSON.parse(result.body).auth) { next() } 
    else { res.redirect('/home') }
  })
}

function isAuthenticated(req, res, next) {
  console.log('\nisAuthentication...')
  request.get(apigateway + '/check?token=' + req.session.token, (err, result) => {
    if (err) { return console.log(err) }
    if (JSON.parse(result.body).auth) { next() }
    else { res.redirect('/') }
  })
}

module.exports = router
