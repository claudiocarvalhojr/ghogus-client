const express = require('express')
const request = require('request')
const router = express.Router()

const APP_TITLE = process.env.APP_TITLE
const API_GATEWAY = process.env.API_GATEWAY

var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated())
    return next()
  res.redirect('/')
}

var isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated())
    return next()
  res.redirect('/')
}

var isTokenValid = (req, res, next) => {
  request.get(API_GATEWAY + '/check?token=' + req.session.token, (error, result) => {
    if (error) { return console.log('get/check/error: ' + error) }
    if (JSON.parse(result.body).auth) {
      return next()
    }
    req.session.token = null
    req.logout()
    // res.redirect('/')
    // res.redirect('/logout')
    if (req.session.register) {
      req.session.register = false
      return res.render('index', {
        page: './templates/login/form',
        title: APP_TITLE,
        menu: 'small',
        message: null
      })
    }
    res.render('index', {
      page: './templates/login/form',
      title: APP_TITLE,
      menu: 'small',
      message: 'Sua sessão expirou!'
    })
  })
}

function log(message) {
  let data = new Date()
  console.log('****************************************')
  console.log(data.toLocaleString() + ' - ' + message)
  // console.log('****************************************')
}

function problem(res, codeError) {
  if (req.isAuthenticated()) {
    return res.render('index', {
      page: './templates/structure/error',
      title: APP_TITLE,
      menu: 'full',
      code_error: codeError
    })
  }
  res.render('index', {
    page: './templates/structure/error',
    title: APP_TITLE,
    menu: 'small',
    code_error: codeError
  })
}

module.exports = (passport) => {

  /* INDEX */
  router.get('/', (req, res, next) => {
    log('index... ')

    // console.log('Cookies: ', req.cookies)

    req.session.register = false
    request.get(API_GATEWAY + '/products', (error, result) => {
      if (error) { return console.log('get/index/error: ' + error) }
      if (result.statusCode == 200) {

        // let body = JSON.parse(result.body)
        // let price = '150.000.000,99'       
        // price = price.split('.').join('')
        // price = price.replace(',', '.')
        // console.log('PRICE1: ' + price)
        // console.log('CALC-1: ' + (parseFloat(price) - ((parseFloat(price) / 100) * parseInt('50'))).toFixed(2).toLocaleString('pt-BR', {minimumFractionDigits: 2}) )
        // console.log('DISC-1: ' + body[0].discount)
        // console.log('CALC-2: ' + (parseFloat('299.90') - ((parseFloat('299.90') / 100) * parseInt('50'))) )
        // console.log('CALC-3: ' + (parseFloat(body[0].price) - ((parseFloat(body[0].price) / 100) * parseInt(body[0].discount))).toFixed(2).replace('.', ',').split('').reverse().map((v, i) => i > 5 && (i + 6) % 3 === 0 ? `${v}.` : v).reverse().join(''))

        if (req.isAuthenticated()) {
          return res.render('index', {
            page: './templates/home',
            title: APP_TITLE,
            menu: 'full',
            docs: JSON.parse(result.body)
          })
        }
        return res.render('index', {
          page: './templates/home',
          title: APP_TITLE,
          menu: 'small',
          docs: JSON.parse(result.body)
        })
      }
      problem(res, result.statusCode)
    })
  })

  /* LOGIN */
  router.get('/login', isNotAuthenticated, (req, res, next) => {
    log('get/index... ')
    req.session.register = false
    res.render('index', {
      page: './templates/login/form',
      title: APP_TITLE,
      menu: 'small',
      message: req.flash('message')
    })
  })

  /* LOGIN */
  router.post('/login', passport.authenticate('login', {
    // successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
  }),
    (req, res) => {
      log('post/login...')
      request.post(API_GATEWAY + '/login', {
        json: {
          'id': req.user._id,
          'email': req.user.email
        }
      }, (error, response, body) => {
        if (error) { return console.log('get/login/error: ' + error) }
        if (response.body.auth) {
          req.session.token = response.body.token
          // res.cookie('sessionId', response.body.token)
          res.redirect('/')
        }
      })
    }
  )

  /* HOME */
  // router.get('/home', (req, res, next) => {
  //   log('get/home...')
  //   request.get(API_GATEWAY + '/products', (error, result) => {
  //     if (error) { return console.log('get/home/error: ' + error) }
  //     if (result.statusCode == 200) {
  //       if (req.isAuthenticated()) {
  //         return res.render('index', {
  //           page: './templates/home',
  //           title: APP_TITLE,
  //           menu: 'full',
  //           docs: JSON.parse(result.body)
  //         })
  //       }
  //       return res.render('index', {
  //         page: './templates/home',
  //         title: APP_TITLE,
  //         menu: 'small',
  //         docs: JSON.parse(result.body)
  //       })
  //     }
  //     problem(res, result.statusCode)
  //   })
  // })

  /* LOGOUT */
  router.get('/logout', isAuthenticated, (req, res, next) => {
    log('get/logout...')
    request.get(API_GATEWAY + '/logout', (error, result) => {
      if (error) { return console.log('get/logout/error: ' + error) }
      req.session.token = JSON.parse(result.body).token
      req.logout()
      res.redirect('/')
    })
  })

  /* REGISTER */
  router.get('/registro', isNotAuthenticated, (req, res) => {
    log('get/register... ')
    res.render('index', {
      page: './templates/register/form',
      title: APP_TITLE,
      menu: 'small',
      message: req.flash('message')
    });
  });

  /* REGISTER-SUCCESS */
  router.post('/signup', passport.authenticate('signup', {
    // successRedirect: '/home',
    failureRedirect: '/registro',
    failureFlash: true
  }),
    (req, res) => {
      log('post/signup/success...')
      req.session.register = true
      res.render('index', {
        page: './templates/register/success',
        title: APP_TITLE,
        menu: 'small',
        success: true,
        firstName: req.user.firstName,
        email: req.user.email,
        message: req.flash('message')
      });
    }
  );

  /* CONTATO */
  router.get('/contato', (req, res, next) => {
    log('get/contact...')
    if (req.isAuthenticated()) {
      return res.render('index', {
        page: './templates/structure/contact',
        title: APP_TITLE,
        menu: 'full',
        name: req.session.user
      })
    }
    res.render('index', {
      page: './templates/structure/contact',
      title: APP_TITLE,
      menu: 'small',
      name: req.session.user
    })
  })

  /* MY-ACCOUNT */
  router.get('/minha-conta', isAuthenticated, isTokenValid, (req, res, next) => {
    log('get/my-account...')
    request.get(API_GATEWAY + '/user?id=' + req.user._id + '&token=' + req.session.token, (error, result) => {
      if (error) { return console.log('get/my-account/error: ' + error) }

      // console.log('RESULT: ' + result.body)

      if (result.statusCode == 200) {
        return res.render('index', {
          page: './templates/structure/my-account',
          title: APP_TITLE,
          menu: 'full',
          name: req.user.firstName + ' ' + req.user.lastName,
          doc: JSON.parse(result.body)
        })
      }
      problem(res, result.statusCode)
    })
  })

  /* USERS */
  router.get('/usuarios', isAuthenticated, isTokenValid, (req, res, next) => {
    log('get/users...')
    request.get(API_GATEWAY + '/users?token=' + req.session.token, (error, result) => {
      if (error) { return console.log('get/users/error: ' + error) }

      // console.log('RESULT: ' + result.body)

      if (result.statusCode == 200) {
        return res.render('index', {
          page: './templates/users',
          title: APP_TITLE,
          menu: 'full',
          docs: JSON.parse(result.body)
        })
      }
      problem(res, result.statusCode)
    })
  })

  /* CUSTOMERS */
  router.get('/clientes', isAuthenticated, isTokenValid, (req, res, next) => {
    log('get/customers...')
    request.get(API_GATEWAY + '/customers?token=' + req.session.token, (error, result) => {
      if (error) { return console.log('get/customers/error: ' + error) }

      // console.log('RESULT: ' + result.body)

      if (result.statusCode == 200) {
        return res.render('index', {
          page: './templates/customers',
          title: APP_TITLE,
          menu: 'full',
          docs: JSON.parse(result.body)
        })
      }
      problem(res, result.statusCode)
    })
  })

  return router
}