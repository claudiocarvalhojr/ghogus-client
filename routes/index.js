const utils = require('../utils')
const manager = require('../manager')
const express = require('express')
const router = express.Router()

let productsHome = async (req, res) => {
    utils.log('index... ')
    let products = await manager.find('/products')
    if (req.isAuthenticated()) {
        return res.render('index', {
            page: './templates/home',
            title: process.env.APP_TITLE,
            menu: 'full',
            products: products
        })
    }
    return res.render('index', {
        page: './templates/home',
        title: process.env.APP_TITLE,
        menu: 'small',
        products: products
    })
}

let loginAPIManager = async (req, res) => {
    utils.log('login-APIManager...')
    let result = await manager.send('post', '/login', { 'id': req.user._id, 'email': req.user.email })
    if (result.auth) {
        req.session.token = result.token
        if (req.cookies.sessionId !== undefined) {
            utils.log('get/cart/update/user...')
            let carts = await manager.find('/cart/search/' + JSON.stringify({ values: { sessionId: req.cookies.sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }))
            if (carts[0] !== null)
                await manager.send('patch', '/cart/' + carts[0]._id, { 'customer': { '_id': req.user._id }, 'changeDate': new Date().toLocaleString() })
        }
        res.redirect('/')
    }
}

let logoutAPIManager = async (req, res) => {
    utils.log('logout-APIManager...')
    let result = await manager.find('/logout')
    req.session.token = result.token
    req.logout()
    res.redirect('/')
}

let userManager = async (req, res) => {
    utils.log('get/my-account...')
    let user = await manager.find('/user?id=' + req.user._id + '&token=' + req.session.token)
    return res.render('index', {
        page: './templates/structure/my-account',
        title: process.env.APP_TITLE,
        menu: 'full',
        user: user
    })
}

let usersManager = async (req, res) => {
    utils.log('get/users...')
    let users = await manager.find('/users?token=' + req.session.token)
    return res.render('index', {
        page: './templates/users',
        title: process.env.APP_TITLE,
        menu: 'full',
        users: users
    })
}

let customerManager = async (req, res) => {
    utils.log('get/customers...')
    let customers = await manager.find('/customers?token=' + req.session.token)
    return res.render('index', {
        page: './templates/customers',
        title: process.env.APP_TITLE,
        menu: 'full',
        customers: customers
    })
}

module.exports = (passport) => {

    /* INDEX */
    router.get('/', (req, res, next) => {
        utils.log('index... ')
        // console.log('Cookies: ', req.cookies)
        productsHome(req, res)
    })

    /* LOGIN */
    router.get('/login', manager.isNotAuthenticated, (req, res, next) => {
        utils.log('get/index... ')
        res.render('index', {
            page: './templates/login/form',
            title: process.env.APP_TITLE,
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
            loginAPIManager(req, res)
        }
    )

    /* CLEAR SESSION */
    router.get('/clear-session', (req, res, next) => {
        res.clearCookie('sessionId')
        res.redirect('/')
    })

    /* LOGOUT */
    router.get('/logout', manager.isAuthenticated, (req, res, next) => {
        logoutAPIManager(req, res)
    })

    /* REGISTER */
    router.get('/registro', manager.isNotAuthenticated, (req, res) => {
        utils.log('get/register/form... ')
        res.render('index', {
            page: './templates/register/form',
            title: process.env.APP_TITLE,
            menu: 'small',
            message: req.flash('message')
        })
    })

    /* REGISTER-SUCCESS */
    router.post('/signup', passport.authenticate('signup', {
        // successRedirect: '/home',
        failureRedirect: '/registro',
        failureFlash: true
    }),
        (req, res) => {
            utils.log('post/register/success...')
            res.render('index', {
                page: './templates/register/success',
                title: process.env.APP_TITLE,
                menu: 'small',
                success: true,
                user: req.user,
                message: req.flash('message')
            })
        }
    )

    /* CONTATO */
    router.get('/contato', (req, res, next) => {
        utils.log('get/contact...')
        if (req.isAuthenticated()) {
            return res.render('index', {
                page: './templates/structure/contact',
                title: process.env.APP_TITLE,
                menu: 'full',
                name: req.session.user
            })
        }
        res.render('index', {
            page: './templates/structure/contact',
            title: process.env.APP_TITLE,
            menu: 'small',
            name: req.session.user
        })
    })

    /* MY-ACCOUNT */
    router.get('/minha-conta', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        userManager(req, res)
    })

    /* USERS */
    router.get('/usuarios', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        usersManager(req, res)
    })

    /* CUSTOMERS */
    router.get('/clientes', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        customerManager(req, res)
    })

    return router
}