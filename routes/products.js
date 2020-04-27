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
        log('client/cart...')
        let registrationDate = new Date()

        // let add = req.body.add
        // let remove = req.body.remove
        // let product = null

        let sku = null
        let add = false
        let rem = false

        if (req.body.add !== undefined) {
            sku = req.body.add
            console.log('1) ADD: ' + req.body.add)
            add = true
            console.log('1) ADD: ' + add)
        }
        else if (req.body.remove != undefined) {
            sku = req.body.remove
            console.log('2) REM: ' + req.body.remove)
            rem = true
            console.log('2) REM: ' + rem)
        }
        console.log('3) SKU: ' + sku)

        // criar function addProductToCart...

        console.log('token 1: ', req.cookies.sessionId)
        // if (req.cookies.sessionId !== undefined) {
        // res.cookies.clearCookie('sessionId')
        // console.log('token 1: ', req.cookies.sessionId)
        // } else {
        //     console.log('token 3: ', req.cookies.sessionId)
        // }

        // testar aqui se o cookie "session-id" já existe
        if (req.cookies.sessionId === undefined) {
            console.log('Não existe token...')
            // obtem um novo token, gera o cart salva o token (no cookie e no cart), add o product ao cart
            log('client/cart/session-id...')
            request.get(process.env.API_GATEWAY + '/session-id', (error, result) => {
                if (error) { return console.log('ERROR: ' + error) }
                // console.log('CODE: ' + result.statusCode)

                // cria o cart, salva o token gerado (no cookie e no cart), add o product ao cart e direciona ao cart

                if (result.statusCode == 200) {
                    res.cookie('sessionId', JSON.parse(result.body).token, { maxAge: 20000 })

                    let sessionId = JSON.parse(result.body).token
                    let authenticated = req.isAuthenticated()

                    let findProduct = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
                    log('client/cart/product...')
                    request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
                        if (error) { return console.log('ERROR: ' + error) }
                            // console.log('CODE: ' + result.statusCode)
                            // console.log('\nRESULT: ' + result.body)
                            // console.log('SIZE: ' + JSON.parse(result.body).length)
                            if (result.statusCode == 200) {
                            let product = null
                            if (JSON.parse(result.body).length > 0) {
                                product = JSON.parse(result.body)[0]

                                console.log('PRODUCT: ' + product.sku)

                                // let ObjectId = require('mongodb').ObjectId;
                                let productId = mongoose.Types.ObjectId(product._id);
                                let imageId = mongoose.Types.ObjectId(product.images[0]._id);

                                if (add) {
                                    log('client/cart/post...')
                                    request.post(API_GATEWAY + '/cart', {
                                        json: {
                                            'sessionId': sessionId,
                                            'products': [{
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
                                            }],
                                            'isLogged': authenticated,
                                            'isValid': true,
                                            'isGift': false,
                                            'voucher': null,
                                            'postalCode': null,
                                            'customer': req.user,
                                            'registrationDate': registrationDate.toLocaleString(),
                                            'changeDate': registrationDate.toLocaleString()
                                        }
                                    }, (error, response, body) => {
                                        if (error) { return console.log('ERRO: ' + error) }
                                        // console.log('\nCODE: ' + response.statusCode)
                                        // console.log('\nMESSAGE: ' + body.message + '\n')
                                        if (response.statusCode == 200) {
                                            let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                                            
                                            log('client/cart/search...')
                                            request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                                                if (error) { return console.log('ERROR: ' + error) }
                                                // console.log('\nCODE: ' + result.statusCode)
                                                // console.log('\nRESULT: ' + result.body)
                                                if (result.statusCode == 200) {
                                                    let cart = JSON.parse(result.body)[0]

                                                    console.log('PRODUCTS: ' + cart.products[0])

                                                    cart.products.forEach(function (product) {
                                                        console.log('SKU: ' + product.sku)
                                                        console.log('PRICE: ' + product.price)
                                                        console.log('DISCOUNT: ' + product.discount)
                                                    })

                                                    if (req.isAuthenticated()) {
                                                        return res.render('index', {
                                                            page: './templates/cart',
                                                            title: APP_TITLE,
                                                            menu: 'full',
                                                            cart: cart,
                                                            products: cart.products,
                                                            message: null
                                                        })
                                                    }
                                                    return res.render('index', {
                                                        page: './templates/cart',
                                                        title: APP_TITLE,
                                                        menu: 'small',
                                                        cart: cart,
                                                        message: null
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

            console.log('Já existe token...')
            // recupera o token, consulta o cart pelo token, add o product ao cart e direciona ao cart

            // const product = getProduct(sku)
            // product.then(product => console.log('\nSKU: ' + product.sku + '\n'))
            // const product = getProduct2(sku)
            // console.log('sku: ' + product.sku)

            // console.log('Aqui...')

            // log('getProduct(' + sku + ')...')

            // console.log('ID: ' + req.params.id)
            let search = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
            request.get(API_GATEWAY + '/product/' + JSON.stringify(search), (error, result) => {
                if (error) { return console.log('ERROR: ' + error) }
                // console.log('CODE: ' + result.statusCode)
                if (result.statusCode == 200) {
                    // console.log('\nRESULT: ' + result.body)
                    // console.log('SIZE: ' + JSON.parse(result.body).length)
                    let product = null
                    if (JSON.parse(result.body).length > 0) {
                        product = JSON.parse(result.body)[0]
                        // console.log('PRODUCT.SKU: ' + product.sku)
                    }
                    if (req.isAuthenticated()) {
                        return res.render('index', {
                            page: './templates/cart',
                            title: APP_TITLE,
                            menu: 'full',
                            product: product,
                            message: null
                        })
                    }
                    return res.render('index', {
                        page: './templates/cart',
                        title: APP_TITLE,
                        menu: 'small',
                        product: product,
                        message: null
                    })
                }
                problem(res, result.statusCode)
            })
        }
    })

    router.get('/cart', (req, res, next) => {
        log('client/cart...')
        if (req.cookies.sessionId === undefined) {
            console.log('Não existe token...')
            if (req.isAuthenticated()) {
                return res.render('index', {
                    page: './templates/cart',
                    title: APP_TITLE,
                    menu: 'full',
                    product: null,
                    message: null
                })
            }
            return res.render('index', {
                page: './templates/cart',
                title: APP_TITLE,
                menu: 'small',
                product: null,
                message: null
            })
        }
        else {

            // consultar carrinho

            console.log('Já existe token...')
            console.log('token: ', req.cookies.sessionId)

            let search = { values: { sku: '1148100020003U' }, fields: 'sku', ordination: 1, limit: 1 }
            request.get(API_GATEWAY + '/product/' + JSON.stringify(search), (error, result) => {
                if (error) { return console.log('ERROR: ' + error) }
                // console.log('CODE: ' + result.statusCode)
                if (result.statusCode == 200) {
                    // console.log('\nRESULT: ' + result.body)
                    // console.log('SIZE: ' + JSON.parse(result.body).length)
                    let product = null
                    if (JSON.parse(result.body).length > 0) {
                        product = JSON.parse(result.body)[0]
                        // console.log('PRODUCT.SKU: ' + product.sku)
                    }
                    if (req.isAuthenticated()) {
                        return res.render('index', {
                            page: './templates/cart',
                            title: APP_TITLE,
                            menu: 'full',
                            product: product,
                            message: null
                        })
                    }
                    return res.render('index', {
                        page: './templates/cart',
                        title: APP_TITLE,
                        menu: 'small',
                        product: product,
                        message: null
                    })
                }
                problem(res, result.statusCode)
            })
        }
    })

    /* FORM PRODUCT */
    router.get('/produtos/new', isAuthenticated, (req, res, next) => {
        log('client/products/new...')
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
        log('client/products/post...')
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
        let images = null

        // console.log('VALOR: ' + (parseFloat(price) - (((parseFloat(price) / 100) * discount))).toFixed(2).replace('.', ',').split('').reverse().map((v, i) => i > 5 && (i + 6) % 3 === 0 ? `${v}.` : v).reverse().join('') )

        // log('client/images/post...')
        // request.post(API_GATEWAY + '/images?token=' + req.session.token, {
        //     json: {
        //         'name': req.body.image,
        //         'registrationDate': registrationDate.toLocaleString(),
        //         'changeDate': registrationDate.toLocaleString()
        //     }
        // }, (error, response, body) => {
        //     if (error) { return console.log('ERRO: ' + error) }
        //     if (response.statusCode == 200) {
        //         console.log('\nMESSAGE: ' + body.message + '\n')

        //         log('client/images/last...')
        //         request.get(API_GATEWAY + '/images/last/?token=' + req.session.token, (error, result) => {
        // if (error) { return console.log('ERROR: ' + error) }
        // console.log('CODE: ' + result.statusCode)
        // if (result.statusCode == 200) {
        // console.log('BODY: ' + JSON.parse(result.body))
        // images = JSON.parse(result.body)

        // let imageId = mongoose.Types.ObjectId(images._id); Id atual
        // let imageId = mongoose.Types.ObjectId(); // novo Id

        log('client/products/post...')
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
            if (error) { return console.log('ERRO: ' + error) }
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
        //         }
        //     })
        // }
        // })
    })

    /* LIST PRODUCTS */
    router.get('/produtos/list', isAuthenticated, isTokenValid, (req, res, next) => {
        log('client/products/list...')
        request.get(API_GATEWAY + '/products?token=' + req.session.token, (error, result) => {
            if (error) { return console.log('ERROR: ' + error) }
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
        log('client/product/SKU...')
        let search = { values: { sku: req.params.id }, fields: 'sku', ordination: 1, limit: 1 }
        request.get(API_GATEWAY + '/product/' + JSON.stringify(search), (error, result) => {
            if (error) { return console.log('ERROR: ' + error) }
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

/* PRODUCT */
// const getProduct = async (sku) => new Promise((resolve, reject) => {
//     log('getProduct(' + sku + ')...')
//     // console.log('ID: ' + req.params.id)
//     let search = {values: {sku: sku}, fields: 'sku', ordination: 1, limit: 1}
//     request.get(API_GATEWAY + '/product/' + JSON.stringify(search), (error, result) => {
//         if (error) {
//             return console.log('ERROR: ' + error)
//         }
//         console.log('CODE: ' + result.statusCode)
//         if (result.statusCode == 200) {
//             console.log('RESULT: ' + JSON.parse(result.body)[0].sku)
//             let product = JSON.parse(result.body)[0]
//             console.log('PRODUCT: ' + product.sku)
//             resolve(product)
//         }
//         // problem(res, result.statusCode)
//     })
// })

// async function getProduct2(sku) {
//     log('getProduct(' + sku + ')...')
//     // console.log('ID: ' + req.params.id)
//     let search = {values: {sku: sku}, fields: 'sku', ordination: 1, limit: 1}
//     request.get(API_GATEWAY + '/product/' + JSON.stringify(search), (error, result) => {
//         if (error) {
//             return console.log('ERROR: ' + error)
//         }
//         console.log('CODE: ' + result.statusCode)
//         if (result.statusCode == 200) {
//             console.log('RESULT: ' + JSON.parse(result.body)[0].sku)
//             let product = JSON.parse(result.body)[0]
//             console.log('PRODUCT: ' + product.sku)
//             // resolve(product)
//             return product
//         }
//         problem(res, result.statusCode)
//     })
// }