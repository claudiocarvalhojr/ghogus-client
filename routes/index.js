const utils = require('../utils')
const manager = require('../manager')
const express = require('express')
const router = express.Router()

let productsHome = async (req, res) => {
    utils.log('productsHome()... ')
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

let mergeCart = async (req, res) => {

}

let loginAPIManager = async (req, res) => {
    utils.log('loginAPIManager()...')
    let result = await manager.send('post', '/login', { 'id': req.user._id, 'email': req.user.email })
    if (result.auth) {
        req.session.token = result.token
        if (req.cookies.sessionId !== undefined) {            
            let cartSession = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
            if (cartSession[0] !== undefined && cartSession[0] !== null && cartSession[0].isEnabled) {
                let cartUser = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
                if (cartUser[0] !== undefined && cartUser[0] !== null && cartUser[0].isEnabled) {
                    let addItem = false
                    let updateQty = false
                    cartUser[0].products.forEach(function (product1) {
                        cartSession[0].products.forEach(function (product2) {
                            if (product2.sku.localeCompare(product1.sku) == 0) {
                                updateQty = true
                                if ((product2.qty + product1.qty) <= process.env.LIMIT_QTY_ITEM_CART) {
                                    product1.qty += product2.qty
                                } else {
                                    product1.qty = process.env.LIMIT_QTY_ITEM_CART
                                }
                            } else {
                                addItem = true
                                cartUser[0].products.push(product2)
                            }
                        })
                    })
                    if (updateQty) {
                        utils.log('patch/cart-user/merge/products/qtys...')
                        let updateCartItemsQty = {
                            'products': cartUser[0].products,
                            'changeDate': new Date().toLocaleString()
                        }
                        await manager.send('patch', '/cart/set/' + cartUser[0]._id, updateCartItemsQty)
                    }
                    if (addItem) {
                        utils.log('patch/cart-user/merge/products...')
                        let addCartItems = {
                            'products': cartUser[0].products,
                            'changeDate': new Date().toLocaleString()
                        }
                        await manager.send('patch', '/cart/push/' + cartUser[0]._id, addCartItems)
                    }
                    if (updateQty || addItem) {
                        utils.log('patch/cart-session/disable...')
                        let isEnabled = { 'isEnabled': false }
                        await manager.send('patch', '/cart/' + cartSession[0]._id, isEnabled)
                    }
                }
                else if (cartUser[0] === undefined || cartUser[0] === null) {
                    utils.log('patch/cart-session/update/user...')
                    let updateUser = { 'customer': { '_id': req.user._id }, 'changeDate': new Date().toLocaleString() }
                    await manager.send('patch', '/cart/' + cartSession[0]._id, updateUser)
                }
            }
            return res.redirect('/cart')
        }
        res.redirect('/')
    }
}

let logoutAPIManager = async (req, res) => {
    utils.log('logoutAPIManager()...')
    let result = await manager.find('/logout')
    req.session.token = result.token
    req.logout()
    res.redirect('/')
}

let userManager = async (req, res) => {
    utils.log('userManager()...')
    let user = await manager.find('/user?id=' + req.user._id + '&token=' + req.session.token)
    return res.render('index', {
        page: './templates/structure/my-account',
        title: process.env.APP_TITLE,
        menu: 'full',
        user: user
    })
}

let usersManager = async (req, res) => {
    utils.log('usersManager()...')
    let users = await manager.find('/users?token=' + req.session.token)
    return res.render('index', {
        page: './templates/users',
        title: process.env.APP_TITLE,
        menu: 'full',
        users: users
    })
}

let customerManager = async (req, res) => {
    utils.log('customerManager()...')
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
        // console.log('Cookies: ', req.cookies)
        productsHome(req, res)
    })

    /* LOGIN */
    router.get('/login', manager.isNotAuthenticated, (req, res, next) => {
        utils.log('get/login/form... ')
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
        utils.log('get/clear-session...')
        res.clearCookie('sessionId')
        res.redirect('/')
    })

    /* LOGOUT */
    router.get('/logout', manager.isAuthenticated, (req, res, next) => {
        utils.log('get/logout...')
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