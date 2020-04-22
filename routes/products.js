var Product = require('../models/product');
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
    res.redirect('/home')
}

var isTokenValid = (req, res, next) => {
    request.get(API_GATEWAY + '/check?token=' + req.session.token, (error, result) => {
        if (error) { return console.log('ERROR: ' + error) }
        if (JSON.parse(result.body).auth)
            return next()
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
    console.log(data.toLocaleDateString() + ' ' + data.toLocaleTimeString() + ' - ' + message)
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

module.exports = () => {

    /* FORM PRODUCT */
    router.get('/produtos/new', isAuthenticated, (req, res, next) => {
        log('client/products/new...')
        res.render('index', {
            page: './templates/products/form',
            title: APP_TITLE,
            menu: 'full',
            message: null
        })
    })

    /* SAVE PRODUCT */
    router.post('/produtos/save', isAuthenticated, isTokenValid, (req, res, next) => {

        let price = req.body.price.split('.').join('')
        price = price.replace(',', '.')

        let discount = parseInt(req.body.discount)

        let online = false
        if (req.body.online)
            online = true
        let saleable = false
        if (req.body.saleable)
            saleable = true
        let registerDate = new Date()
        let onlineDate = new Date(req.body.onlineDate)
        let saleableDte = new Date(req.body.saleableDate)
        let images = null

        console.log('VALOR: ' + (req.body.price - ((req.body.price) * req.body.discount)));

        log('client/images/save...')
        request.post(API_GATEWAY + '/images?token=' + req.session.token, {
            json: {
                'image': req.body.image
            }
        }, (error, response, body) => {
            if (error) { return console.log('ERRO: ' + error) }
            if (response.statusCode == 200) {
                // console.log('\nMESSAGE: ' + body.message + '\n')
                log('client/images/last...')
                request.get(API_GATEWAY + '/images/last?token=' + req.session.token, (error, result) => {
                    if (error) { return console.log('ERROR: ' + error) }
                    // console.log('BODY: ' + result.body)
                    if (result.statusCode == 200) {
                        // console.log('\nIMAGES: ' + JSON.parse(result.body) + '\n')
                        images = JSON.parse(result.body)
                        log('client/products/save...')
                        request.post(API_GATEWAY + '/products?token=' + req.session.token, {
                            json: {
                                'sku': req.body.sku,
                                'title': req.body.title,
                                'description': req.body.description,
                                'price': price,
                                'discount': discount,
                                'online': online,
                                'onlineDate': onlineDate.toLocaleString(),
                                'saleable': saleable,
                                'saleableDate': saleableDte.toLocaleString(),
                                'registerDate': registerDate.toLocaleString(),
                                'images': images
                            }
                        }, (error, response, body) => {
                            if (error) { return console.log('ERRO: ' + error) }
                            // console.log('\nCODE: ' + response.statusCode)
                            // console.log('BODY: ' + body.message + '\n')
                            if (response.statusCode == 200) {
                                return res.render('index', {
                                    page: './templates/products/success',
                                    title: APP_TITLE,
                                    menu: 'full',
                                    docs: body,
                                    message: body.message
                                })
                            }
                        })
                    }
                })
            }
        })
    })

    /* LIST PRODUCTS */
    router.get('/produtos/list', isAuthenticated, isTokenValid, (req, res, next) => {
        log('client/products/list...')
        request.get(API_GATEWAY + '/products?token=' + req.session.token, (error, result) => {
            if (error) { return console.log('ERROR: ' + error) }

            // console.log('RESULT: ' + result.body)

            if (result.statusCode == 200) {
                return res.render('index', {
                    page: './templates/products/list',
                    title: APP_TITLE,
                    menu: 'full',
                    docs: JSON.parse(result.body)
                })
            }
            problem(res, result.statusCode)
        })
    })

    /* PRODUCT */
    router.get('/produto/:id', (req, res, next) => {
        log('client/product/SKU...')

        // console.log('ID: ' + req.params.id)

        request.get(API_GATEWAY + '/product/' + req.params.id, (error, result) => {
            if (error) { return console.log('ERROR: ' + error) }
            if (result.statusCode == 200) {
                return res.render('index', {
                    page: './templates/product',
                    title: APP_TITLE,
                    menu: 'full',
                    product: JSON.parse(result.body)[0]
                })
            }
            problem(res, result.statusCode)
        })
    })

    return router;

}