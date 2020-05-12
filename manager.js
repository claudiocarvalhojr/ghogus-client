const fetch = require('node-fetch')
var utils = require('./utils');
const API_GATEWAY = process.env.API_GATEWAY

let isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated())
        return next()
    res.redirect('/')
}

var isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated())
      return next()
    res.redirect('/')
  }

let isTokenValid = async (req, res, next) => {
    let result = await find('/check?token=' + req.session.token)
    if (result.auth) {
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

let check = (res) => {
    // console.log('CODE: ' + res.status + ', TEXT: ' + res.statusText)
    if (res.ok)
        return res
}

let find = async (url) => {
    utils.log('get/find(url)...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url)
                .then(check)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

let send = async (method, url, params) => {
    utils.log(method + '/cart...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url, {
                method: method,
                body: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(check)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

module.exports = { find, send, isAuthenticated, isNotAuthenticated, isTokenValid, problem }