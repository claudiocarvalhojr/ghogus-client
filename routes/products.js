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
            log('client/cart/session-id...')
            request.get(process.env.API_GATEWAY + '/session-id', (error, result) => {
                if (error) { return console.log('ERROR: ' + error) }
                if (result.statusCode == 200) {
                    // add o token ao cookie e define a vida últil dele: 60mim (teste)
                    let ageSessionId = 1000*60*5
                    res.cookie('sessionId', JSON.parse(result.body).token, { maxAge: ageSessionId })
                    let sessionId = JSON.parse(result.body).token
                    let authenticated = req.isAuthenticated()
                    // busca o produto para add ao cart, através do sku vindo da PDP
                    let findProduct = { values: { sku: sku }, fields: 'sku', ordination: 1, limit: 1 }
                    log('client/cart/product...')
                    request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
                        if (error) { return console.log('ERROR: ' + error) }
                        if (result.statusCode == 200) {
                            let product = null
                            if (JSON.parse(result.body).length > 0) {
                                product = JSON.parse(result.body)[0]
                                let productId = mongoose.Types.ObjectId(product._id);
                                if (add) {
                                    // cria um novo cart, add produto e token ao cart
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
                                            'customer': user,
                                            'registrationDate': registrationDate.toLocaleString(),
                                            'changeDate': registrationDate.toLocaleString()
                                        }
                                    }, (error, response, body) => {
                                        if (error) { return console.log('ERRO: ' + error) }
                                        if (response.statusCode == 200) {
                                            // busca o cart recém criado e exibe a página do cart
                                            let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                                            log('client/cart/search...')
                                            request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                                                if (error) { return console.log('ERROR: ' + error) }
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
            log('client/cart/product...')
            request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
                if (error) { return console.log('ERROR: ' + error) }
                if (result.statusCode == 200) {
                    let product = null
                    if (JSON.parse(result.body).length > 0) {
                        product = JSON.parse(result.body)[0]
                        let productId = mongoose.Types.ObjectId(product._id);
                        // busca o cart recém criado e exibe a página do cart
                        let sessionId = req.cookies.sessionId
                        let findCart = { values: { sessionId: sessionId }, fields: 'sessionId', ordination: 1, limit: 1 }
                        log('client/cart/search...')
                        request.get(API_GATEWAY + '/cart/' + JSON.stringify(findCart), (error, result) => {
                            if (error) { return console.log('ERROR: ' + error) }
                            if (result.statusCode == 200) {
                                let cart = JSON.parse(result.body)[0]
                                let products = cart.products
                                console.log('SIZE: ' + products.length)
                                if (products.length > 0) {
                                    let isEquals = false
                                    let count = 0
                                    let position = 0
                                    let compare = null
                                    let product = null
                                    while (count < products.length) {
                                        compare = products[position].sku.localeCompare(sku)
                                        if (compare == 0 && !isEquals) {
                                            isEquals = true
                                            product = products[count]
                                            position = count
                                            cart.products[position].qty++
                                        }
                                        console.log('SKU: ' + sku + ' | P.SKU: ' + products[count].sku + ' | EQUAL: ' + compare)
                                        count++                                        
                                    }

                                    if (!isEquals) {
                                        console.log('isExist: ' + isEquals)

                                        // add item cart (NOVO ITEM)

                                    } else {
                                        console.log('product: ' + JSON.stringify(product))

                                        // cart.products[position].qty++

                                        console.log('QTY: ' + products[position].qty)
                                        console.log('cart: ' + JSON.stringify(cart))
                                        // cart.changeDate = new Date().toLocaleString()

                                        request.patch(API_GATEWAY + '/cart/' + cart._id + '_' + products[position]._id, {
                                            json: {
                                                'products.$.qty': products[position].qty,
                                                'changeDate': new Date().toLocaleString()
                                            }
                                        }, (error, response, body) => {
                                            if (error) { return console.log('ERRO: ' + error) }
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
                                    }
                                    // if (compare == 0) {
                                    //     console.log('produto já existe... Position: ' + position)
                                    // } else {
                                    //     console.log('produto não existe... Position: ' + position)
                                    // }
                                    // if (add) {
                                    //     console.log('Aqui... Add...')
                                    //     // add produto ao cart (add quando novo item ou update qty de item já add anteriormente)
                                    // } else if (rem) {
                                    //     console.log('Aqui... Rem...')
                                    //     // remove produto do cart
                                    // }
                                }
                            }
                        })
                    }
                }
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
        // console.log('VALOR: ' + (parseFloat(price) - (((parseFloat(price) / 100) * discount))).toFixed(2).replace('.', ',').split('').reverse().map((v, i) => i > 5 && (i + 6) % 3 === 0 ? `${v}.` : v).reverse().join('') )
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
        let findProduct = { values: { sku: req.params.id }, fields: 'sku', ordination: 1, limit: 1 }
        request.get(API_GATEWAY + '/product/' + JSON.stringify(findProduct), (error, result) => {
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