// var Product = require('../models/product')
const express = require('express')
const request = require('request')
let mongoose = require('mongoose');
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
        if (error) { return console.log('get/check/error: ' + error) }
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

module.exports = () => {

    /* BUY PRODUCT */
    router.post('/cart', (req, res, next) => {
        log('post/cart...')
        let registrationDate = new Date()
        let user = req.user
        let sku = null
        let add = false
        let rem = false
        if (req.body.add !== undefined) {
            sku = req.body.add
            add = true
        }
        else if (req.body.remove != undefined) {
            sku = req.body.remove
            rem = true
        }
        // verifica se já existe o cookie "session-id" (que contém o token), caso não, cria um novo token e cart
        if (req.cookies.sessionId === undefined) {
            //Não existe token... e ADD true...
            if (add) {
                //gera um novo token
                log('get/cart/session-id...')
                request.get(process.env.API_GATEWAY + '/session-id', (error, result) => {
                    if (error) { return console.log('get/cart/session-id/error: ' + error) }
                    if (result.statusCode == 200) {
                        // add o token ao cookie e define a vida últil dele: 60mim (teste)
                        // let ageSessionId = ((((1000 * 60) * 60) * 24) * 5)
                        let ageSessionId = ((1000 * 60) * 3)
                        res.cookie('sessionId', JSON.parse(result.body).token, { maxAge: ageSessionId })
                        let sessionId = JSON.parse(result.body).token
                        let authenticated = req.isAuthenticated()
                        // busca o produto para add ao cart, através do sku vindo da PDP
                        let findProduct = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
                        log('get/cart/product...')
                        request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
                            if (error) { return console.log('get/cart/product/error: ' + error) }
                            if (result.statusCode == 200) {
                                let product = null
                                if (JSON.parse(result.body).length > 0) {
                                    product = JSON.parse(result.body)[0]
                                    let productId = mongoose.Types.ObjectId(product._id);
                                    if (add) {
                                        // cria um novo cart, add produto e token ao cart
                                        log('post/cart...')
                                        request.post(API_GATEWAY + '/cart', {
                                            json: {
                                                'sessionId': sessionId,
                                                'isLogged': authenticated,
                                                'isValid': true,
                                                'isGift': false,
                                                'voucher': null,
                                                'postalCode': null,
                                                'customer': user,
                                                'products': [{
                                                    '_id': product._id,
                                                    'sku': product.sku,
                                                    'title': product.title,
                                                    'price': product.price,
                                                    'discount': product.discount,
                                                    'online': product.online,
                                                    'saleable': product.saleable,
                                                    'qty': 1,
                                                    'images': [{
                                                        'name': product.images[0].name
                                                    }]
                                                }],
                                                'registrationDate': registrationDate.toLocaleString(),
                                                'changeDate': registrationDate.toLocaleString()
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('post/cart/error: ' + error) }
                                            if (response.statusCode == 200) {
                                                // busca o cart recém criado e exibe a página do cart
                                                let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                                                log('get/cart/search...')
                                                request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                                                    if (error) { return console.log('get/cart/search/error: ' + error) }
                                                    if (result.statusCode == 200) {
                                                        let cart = JSON.parse(result.body)[0]
                                                        if (req.isAuthenticated()) {
                                                            return res.render('index', {
                                                                page: './templates/cart',
                                                                title: APP_TITLE,
                                                                menu: 'full',
                                                                cart: cart,
                                                                resume: resume(cart)
                                                            })
                                                        }
                                                        return res.render('index', {
                                                            page: './templates/cart',
                                                            title: APP_TITLE,
                                                            menu: 'small',
                                                            cart: cart,
                                                            resume: resume(cart)
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    }
                                }
                            }
                        })
                    }
                })
            } 
            //Não existe token... e REM true...
            else if (rem) {
                if (req.isAuthenticated()) {
                    return res.render('index', {
                        page: './templates/cart',
                        title: APP_TITLE,
                        menu: 'full',
                        cart: null,
                        resume: resume(null)
                    })
                }
                return res.render('index', {
                    page: './templates/cart',
                    title: APP_TITLE,
                    menu: 'small',
                    cart: null,
                    resume: resume(null)
                })
            }
        } else {
            // verifica se já existe o cookie "session-id" (que contém o token), caso não, cria um novo token e cart
            // busca o produto para add(product)/update(qty)/delete(product) ao cart, através do sku vindo da PDP
            let findProduct = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
            log('get/cart/product...')
            request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
                if (error) { return console.log('get/cart/product/error: ' + error) }
                if (result.statusCode == 200) {
                    let product = null
                    product = JSON.parse(result.body)[0]
                    if (JSON.parse(result.body).length > 0) {
                        product = JSON.parse(result.body)[0]
                        let productId = mongoose.Types.ObjectId(product._id);
                        // busca o cart recém criado e exibe a página do cart
                        let sessionId = req.cookies.sessionId
                        let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                        log('get/cart/search...')
                        request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                            if (error) { return console.log('get/cart/search/error: ' + error) }
                            if (result.statusCode == 200) {
                                let cart = JSON.parse(result.body)[0]
                                if (JSON.parse(result.body).length > 0) {
                                    let isExists = false
                                    let count = 0
                                    let position = 0
                                    let compare = null
                                    while (count < cart.products.length) {
                                        compare = cart.products[count].sku.localeCompare(sku)
                                        if (compare == 0 && !isExists) {
                                            isExists = true
                                            position = count
                                        }
                                        count++
                                    }
                                    // Update product to cart
                                    if (isExists && add) {
                                        // Produto existe, atualiza a qty e changeDate
                                        log('patch/cart/product/set...')
                                        cart.products[position].qty++
                                        request.patch(API_GATEWAY + '/cart/set/' + cart._id + '_' + cart.products[position]._id, {
                                            json: {
                                                'products.$.qty': cart.products[position].qty,
                                                'changeDate': new Date().toLocaleString()
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('patch/cart/product/set/error: ' + error) }
                                            if (response.statusCode == 200) {
                                                if (req.isAuthenticated()) {
                                                    return res.render('index', {
                                                        page: './templates/cart',
                                                        title: APP_TITLE,
                                                        menu: 'full',
                                                        cart: cart,
                                                        resume: resume(cart)
                                                    })
                                                }
                                                return res.render('index', {
                                                    page: './templates/cart',
                                                    title: APP_TITLE,
                                                    menu: 'small',
                                                    cart: cart,
                                                    resume: resume(cart)
                                                })
                                            }
                                        })
                                    }
                                    // Insert new product to cart
                                    else if (!isExists && add) {
                                        // Produto não existe, cria um novo produto e add ao cart
                                        let newProduct = {
                                            '_id': productId,
                                            'sku': product.sku,
                                            'title': product.title,
                                            'price': product.price,
                                            'discount': product.discount,
                                            'online': product.online,
                                            'saleable': product.saleable,
                                            'qty': 1,
                                            'images': [{
                                                'name': product.images[0].name
                                            }]
                                        }
                                        cart.products.push(newProduct)
                                        log('patch/cart/product/push...')
                                        request.patch(API_GATEWAY + '/cart/push/' + cart._id, {
                                            json: {
                                                'products': cart.products,
                                                'changeDate': new Date().toLocaleString()
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('patch/cart/product/error: ' + error) }
                                            if (response.statusCode == 200) {
                                                if (req.isAuthenticated()) {
                                                    return res.render('index', {
                                                        page: './templates/cart',
                                                        title: APP_TITLE,
                                                        menu: 'full',
                                                        cart: cart,
                                                        resume: resume(cart)
                                                    })
                                                }
                                                return res.render('index', {
                                                    page: './templates/cart',
                                                    title: APP_TITLE,
                                                    menu: 'small',
                                                    cart: cart,
                                                    resume: resume(cart)
                                                })
                                            }
                                        })
                                    } else if (isExists && rem) {
                                        log('delete/cart/product/pull...')
                                        request.patch(API_GATEWAY + '/cart/pull/' + cart._id, {
                                            json: { 
                                                'products': { 
                                                    '_id': cart.products[position]._id 
                                                } 
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('delete/cart/product/pull/error: ' + error) }
                                            if (response.statusCode == 200) {
                                                log('get/cart/search...')
                                                request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                                                    if (error) { return console.log('get/cart/search/error: ' + error) }
                                                    if (result.statusCode == 200) {
                                                        cart = JSON.parse(result.body)[0]
                                                        if (cart.products.length == 0) {
                                                            cart = null
                                                        }
                                                        if (req.isAuthenticated()) {
                                                            return res.render('index', {
                                                                page: './templates/cart',
                                                                title: APP_TITLE,
                                                                menu: 'full',
                                                                cart: cart,
                                                                resume: resume(cart)
                                                            })
                                                        }
                                                        return res.render('index', {
                                                            page: './templates/cart',
                                                            title: APP_TITLE,
                                                            menu: 'small',
                                                            cart: cart,
                                                            resume: resume(cart)
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    } else {
                                        // analisar um pouco mais quais as possibilidades levam a ocorrer este problema (chegar até aqui)
                                        console.log('Houve algum problema!')
                                        if (req.isAuthenticated()) {
                                            return res.render('index', {
                                                page: './templates/cart',
                                                title: APP_TITLE,
                                                menu: 'full',
                                                cart: cart,
                                                resume: resume(cart)
                                            })
                                        }
                                        return res.render('index', {
                                            page: './templates/cart',
                                            title: APP_TITLE,
                                            menu: 'small',
                                            cart: cart,
                                            resume: resume(cart)
                                        })
                                    }
                                } else {
                                    // Existe cookie, mas cart está vazio
                                    if (req.cookies.sessionId !== undefined)
                                        res.clearCookie(sessionId)
                                    if (req.isAuthenticated()) {
                                        return res.render('index', {
                                            page: './templates/cart',
                                            title: APP_TITLE,
                                            menu: 'full',
                                            cart: cart,
                                            resume: resume(cart)
                                        })
                                    }
                                    return res.render('index', {
                                        page: './templates/cart',
                                        title: APP_TITLE,
                                        menu: 'small',
                                        cart: cart,
                                        resume: resume(cart)
                                    })
                                }
                            }
                        })
                    }
                }
            })
        }
    })

    router.get('/cart', (req, res, next) => {
        log('get/cart...')
        if (req.cookies.sessionId === undefined) {
            if (req.isAuthenticated()) {
                return res.render('index', {
                    page: './templates/cart',
                    title: APP_TITLE,
                    menu: 'full',
                    cart: null,
                    resume: resume(null)
                })
            }
            return res.render('index', {
                page: './templates/cart',
                title: APP_TITLE,
                menu: 'small',
                cart: null,
                resume: resume(null)
            })
        }
        else {
            // busca o cart e exibe a página do cart
            let sessionId = req.cookies.sessionId
            let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
            log('get/cart/search...')
            request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                if (error) { return console.log('get/cart/search/error: ' + error) }
                if (result.statusCode == 200) {
                    let cart = JSON.parse(result.body)[0]
                    if (cart.products.length == 0) {
                        cart = null
                    }
                    if (req.isAuthenticated()) {
                        return res.render('index', {
                            page: './templates/cart',
                            title: APP_TITLE,
                            menu: 'full',
                            cart: cart,
                            resume: resume(cart)
                        })
                    }
                    return res.render('index', {
                        page: './templates/cart',
                        title: APP_TITLE,
                        menu: 'small',
                        cart: cart,
                        resume: resume(cart)
                    })
                }
            })
        }
    })

    /* FORM PRODUCT */
    router.get('/produtos/new', isAuthenticated, (req, res, next) => {
        log('get/products/new...')
        let data = new Date()
        dataForm = data.getFullYear() + '-' + ('0' + (data.getMonth())).slice(-2) + '-' + data.getDate() + 'T' + data.toLocaleTimeString()
        res.render('index', {
            page: './templates/products/form',
            title: APP_TITLE,
            menu: 'full',
            date: dataForm,
            message: null
        })
    })

    /* SAVE PRODUCT */
    router.post('/produtos/save', isAuthenticated, isTokenValid, (req, res, next) => {
        let registrationDate = new Date()

        let price = req.body.price.split('.').join('')
        price = price.replace(',', '.')

        let discount = parseInt(req.body.discount)

        let online = false
        if (req.body.online)
            online = true
        let saleable = false
        if (req.body.saleable)
            saleable = true
        let onlineDate = new Date(req.body.onlineDate)
        let saleableDte = new Date(req.body.saleableDate)
        // console.log('VALOR: ' + (parseFloat(price) - (((parseFloat(price) / 100) * discount))).toFixed(2).replace('.', ',').split('').reverse().map((v, i) => i > 5 && (i + 6) % 3 === 0 ? `${v}.` : v).reverse().join('') )
        log('post/products...')
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
                'images': [{
                    'name': req.body.image
                }],
                'root': null,
                'categories': null,
                'subcategories': null,
                'registrationDate': registrationDate.toLocaleString(),
                'changeDate': registrationDate.toLocaleString()
            }
        }, (error, response, body) => {
            if (error) { return console.log('post/products/error: ' + error) }
            // console.log('\nCODE: ' + response.statusCode)
            if (response.statusCode == 200) {
                // console.log('BODY: ' + body.message + '\n')
                return res.render('index', {
                    page: './templates/products/success',
                    title: APP_TITLE,
                    menu: 'full',
                    docs: body,
                    message: body.message
                })
            }
        })
    })

    /* LIST PRODUCTS */
    router.get('/produtos/list', isAuthenticated, isTokenValid, (req, res, next) => {
        log('get/products/list...')
        request.get(API_GATEWAY + '/products?token=' + req.session.token, (error, result) => {
            if (error) { return console.log('get/products/list/error: ' + error) }
            // console.log('CODE: ' + result.statusCode)
            if (result.statusCode == 200) {
                // console.log('RESULT: ' + result.body)
                // console.log('SIZE: ' + JSON.parse(result.body).length)
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
        log('get/product/SKU...')
        let findProduct = { values: { sku: req.params.id }, fields: 'sku', ordination: 1, limit: 1 }
        request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
            if (error) { return console.log('get/product/SKU/error: ' + error) }
            // console.log('CODE: ' + result.statusCode)
            if (result.statusCode == 200) {
                // console.log('\nRESULT: ' + result.body)
                // console.log('SIZE: ' + JSON.parse(result.body).length)
                let product = null
                if (JSON.parse(result.body).length > 0) {
                    product = JSON.parse(result.body)[0]
                }
                if (req.isAuthenticated()) {
                    return res.render('index', {
                        page: './templates/product',
                        title: APP_TITLE,
                        menu: 'full',
                        product: product
                    })
                }
                return res.render('index', {
                    page: './templates/product',
                    title: APP_TITLE,
                    menu: 'small',
                    product: product
                })
            }
            problem(res, result.statusCode)
        })
    })

    return router

}

function resume(cart) {
    let subtotal = 0.00
    let freight = 0.00
    let total = 0.00
    let reprice = 0.00
    if (cart != null) {
        let products = cart.products
        if (products.length > 0) {
            products.forEach(function (product) {
                if (product.discount > 0) {
                    reprice = (parseFloat(product.price) - (((parseFloat(product.price) / 100) * product.discount)))
                    subtotal += reprice * product.qty
                } else {
                    reprice = 0.00
                    subtotal += product.price * product.qty
                }
            })
            total = subtotal + freight
        }
    }
    let resume = {
        'subtotal': subtotal,
        'freight': freight,
        'total': total
    }
    return resume
}