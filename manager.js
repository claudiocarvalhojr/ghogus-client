const fetch = require('node-fetch')
const utils = require('./utils');
const API_GATEWAY = process.env.API_GATEWAY

let isAuthenticated = (req, res, next) => {
    utils.log('isAuthenticated()...')
    if (req.isAuthenticated())
        return next()
    res.redirect('/')
}

var isNotAuthenticated = (req, res, next) => {
    utils.log('isNotAuthenticated()...')
    if (!req.isAuthenticated())
      return next()
    res.redirect('/')
  }

let isTokenValid = async (req, res, next) => {
    utils.log('isTokenValid()...')
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
    utils.log('problem()...')
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

let checkStatus = (res) => {
    utils.log('checkStatus(' + res.status + ')...')
    // console.log('CODE: ' + res.status + ', TEXT: ' + res.statusText)
    if (res.ok)
        return res
}

let find = async (url) => {
    utils.log('find(' + url + ')...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url)
                .then(checkStatus)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

let send = async (method, url, params) => {
    utils.log('send(' + method + ')...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url, {
                method: method,
                body: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(checkStatus)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

module.exports = { find, send, isAuthenticated, isNotAuthenticated, isTokenValid, problem }