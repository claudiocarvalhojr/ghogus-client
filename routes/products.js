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
        console.log('user: ' + user)
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
            console.log('Não existe token...')
            //gera um novo token
            log('get/cart/session-id...')
            request.get(process.env.API_GATEWAY + '/session-id', (error, result) => {
                if (error) { return console.log('get/cart/session-id/error: ' + error) }
                if (result.statusCode == 200) {
                    // add o token ao cookie e define a vida últil dele: 60mim (teste)
                    // let ageSessionId = ((((1000 * 60) * 60) * 24) * 5)
                    let ageSessionId = ((1000 * 60) * 60)
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

                                console.log('productId: ' + productId)

                                if (add) {
                                    // cria um novo cart, add produto e token ao cart
                                    log('post/cart...')
                                    request.post(API_GATEWAY + '/cart', {
                                        json: {
                                            'sessionId': sessionId,
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
                                            'isLogged': authenticated,
                                            'isValid': true,
                                            'isGift': false,
                                            'voucher': null,
                                            'postalCode': null,
                                            'customer': user,
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
                                                            cart: cart
                                                        })
                                                    }
                                                    return res.render('index', {
                                                        page: './templates/cart',
                                                        title: APP_TITLE,
                                                        menu: 'small',
                                                        cart: cart
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
        } else {

            // verifica se já existe o cookie "session-id" (que contém o token), caso não, cria um novo token e cart
            // recupera o token, consulta o cart pelo token, add o product ao cart e direciona ao cart

            console.log('Já existe token...')

            // busca o produto para add/update(qrt)/delete ao cart, através do sku vindo da PDP
            let findProduct = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
            log('get/cart/product...')
            request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {

                console.log('AQUI 1...')

                if (error) { return console.log('get/cart/product/error: ' + error) }
                if (result.statusCode == 200) {
                    let product = null
                    product = JSON.parse(result.body)[0]
                    if (JSON.parse(result.body).length > 0) {

                        console.log('AQUI 2...')

                        product = JSON.parse(result.body)[0]
                        let productId = mongoose.Types.ObjectId(product._id);
                        // busca o cart recém criado e exibe a página do cart
                        let sessionId = req.cookies.sessionId
                        let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                        log('get/cart/search...')
                        request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {

                            console.log('AQUI 3...')

                            if (error) { return console.log('get/cart/search/error: ' + error) }
                            if (result.statusCode == 200) {

                                console.log('AQUI 4...')

                                let cart = JSON.parse(result.body)[0]

                                if (JSON.parse(result.body).length > 0) {

                                    console.log('AQUI 5...')

                                    let isExists = false
                                    let count = 0
                                    let position = 0
                                    let compare = null
                                    // let product = null

                                    console.log('SKU: ' + sku)

                                    while (count < cart.products.length) {

                                        console.log('P.SKU: ' + cart.products[count].sku + ' == SKU: ' + sku)

                                        compare = cart.products[count].sku.localeCompare(sku)
                                        if (compare == 0 && !isExists) {
                                            isExists = true
                                            // product = products[count]
                                            position = count
                                        }
                                        count++
                                    }

                                    if (isExists && add) {

                                        console.log('AQUI 6..')

                                        // Update product to cart

                                        // Produto já existe, atualiza a qty e changeDate
                                        console.log('isExist: ' + isExists)

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
                                                        cart: cart
                                                    })
                                                }
                                                return res.render('index', {
                                                    page: './templates/cart',
                                                    title: APP_TITLE,
                                                    menu: 'small',
                                                    cart: cart
                                                })
                                            }
                                        })

                                    } else if (!isExists && add) {

                                        console.log('AQUI 7...')

                                        // Insert new product to cart

                                        // Produto não existe, cria um novo produto e o add ao cart
                                        console.log('isExist: ' + isExists)

                                        // let productId = mongoose.Types.ObjectId();

                                        console.log('productId: ' + productId)

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

                                        console.log('products: ' + cart.products)

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
                                                        cart: cart
                                                    })
                                                }
                                                return res.render('index', {
                                                    page: './templates/cart',
                                                    title: APP_TITLE,
                                                    menu: 'small',
                                                    cart: cart
                                                })
                                            }
                                        })
                                    } else if (isExists && rem) {

                                        console.log('AQUI 8...')

                                        console.log('REMOVER')

                                        console.log('isExist: ' + isExists)

                                        log('delete/cart/product/pull...')
                                        cart.products[position].qty++
                                        request.delete(API_GATEWAY + '/cart/pull/' + cart._id + '_' + cart.products[position]._id, {
                                            json: {
                                                'products': cart.products[position],
                                                'changeDate': new Date().toLocaleString()
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('delete/cart/product/pull/error: ' + error) }
                                            if (response.statusCode == 200) {

                                                cart.products.pull

                                                if (req.isAuthenticated()) {
                                                    return res.render('index', {
                                                        page: './templates/cart',
                                                        title: APP_TITLE,
                                                        menu: 'full',
                                                        cart: cart
                                                    })
                                                }
                                                return res.render('index', {
                                                    page: './templates/cart',
                                                    title: APP_TITLE,
                                                    menu: 'small',
                                                    cart: cart
                                                })
                                            }
                                        })

                                    } else {

                                        console.log('Houve algum problema!')

                                    }

                                } else {

                                    console.log('Cart vazio!')

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
            console.log('Não existe token...')
            if (req.isAuthenticated()) {
                return res.render('index', {
                    page: './templates/cart',
                    title: APP_TITLE,
                    menu: 'full',
                    cart: null
                })
            }
            return res.render('index', {
                page: './templates/cart',
                title: APP_TITLE,
                menu: 'small',
                cart: null
            })
        }
        else {

            // consultar carrinho

            console.log('Já existe token...')
            console.log('token: ', req.cookies.sessionId)

            // busca o cart recém criado e exibe a página do cart
            let sessionId = req.cookies.sessionId
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
                            cart: cart
                        })
                    }
                    return res.render('index', {
                        page: './templates/cart',
                        title: APP_TITLE,
                        menu: 'small',
                        cart: cart
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
                    console.log('PRODUCT.SKU: ' + product.sku)
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