const utils = require('../utils')
const manager = require('../manager')
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const soap = require('soap')
var Cart = require('../models/cart')
var Product = require('../models/product')

let renderCart = async (req, res, cart) => {
    utils.log('renderCart()...')
    if (cart != null && cart.products.length == 0)
        cart = null
    if (req.isAuthenticated()) {
        return res.render('index', {
            page: './templates/cart',
            title: process.env.APP_TITLE,
            menu: 'full',
            cart: cart,
            resume: cartResume(cart)
        })
    }
    return res.render('index', {
        page: './templates/cart',
        title: process.env.APP_TITLE,
        menu: 'small',
        cart: cart,
        resume: cartResume(cart)
    })
}

let cartResume = (cart) => {
    utils.log('cartResume()...')
    let subtotal = 0.00
    let vFreight = 0.00
    let total = 0.00
    let reprice = 0.00
    if (cart != null) {
        let products = cart.products
        if (products !== undefined && products != null && products.length > 0) {
            products.forEach(function (product) {
                if (product.discount > 0) {
                    reprice = (parseFloat(product.price) - (((parseFloat(product.price) / 100) * product.discount)))
                    subtotal += reprice * product.qty
                } else {
                    reprice = 0.00
                    subtotal += product.price * product.qty
                }
            })
            if (cart.freight.value !== undefined) {
                vFreight = cart.freight.value.replace(',', '.')
                total = subtotal + parseFloat(vFreight)
            } else {
                total = subtotal
            }
        }
    }
    let resume = {
        'subtotal': subtotal,
        'total': total
    }
    return resume
}

let cartManager = async (req, res, next) => {
    // utils.log('cartManager()...')
    let sku = null
    let addCartItem = false
    let updateCartItemQty = false
    let qtyItemCart = 0
    let removeCartItem = false
    let cartId = null
    let freightCart = false
    let postalCode = null
    if (req.body.addCartItemSKU !== undefined) {
        utils.log('cartManager(addCartItem)...')
        sku = req.body.addCartItemSKU
        addCartItem = true
    }
    else if (req.body.updateCartItemQtySKU !== undefined) {
        utils.log('cartManager(updateCartItemQty)...')
        sku = req.body.updateCartItemQtySKU
        updateCartItemQty = true
        qtyItemCart = parseInt(req.body.qty, 10)
    }
    else if (req.body.removeCartItemSKU != undefined) {
        utils.log('cartManager(removeCartItem)...')
        sku = req.body.removeCartItemSKU
        removeCartItem = true
    }
    else if (req.body.freightCartId != undefined) {
        utils.log('cartManager(freightCart)...')
        cartId = req.body.freightCartId
        freightCart = true
        postalCode = req.body.postalCode
    }

    let cart = null
    let newCart = false
    let editCart = false

    if (req.isAuthenticated()) {
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
        console.log('1) cart (logged): ' + cart[0] + ' / .' + cart + '.')
    }
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined) {
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
        console.log('2) cart (session): ' + cart[0] + ' / ' + cart)
    }
    else {
        cart = undefined
        console.log('3) cart (fake): ' + cart)
    }

    if (cart === undefined || cart == null || cart == '') {
        newCart = true
    } else {
        editCart = true
    }

    console.log('newCart: ' + newCart + ' | edit Cart: ' + editCart)

    // novo cart e usuário não logado
    if (!req.isAuthenticated() && newCart) {
        utils.log('Usuário não está logado, será criado novo cart em sessão!')
        let registrationDate = new Date()
        let product = await manager.find('/product/sku/' + sku)
        let sessionId = await manager.find('/session-id')
        // res.cookie('sessionId', sessionId.token, { maxAge: ((((1000 * 60) * 60) * 24) * 7) })
        res.cookie('sessionId', sessionId.token, { maxAge: ((((1000 * 20) * 1) * 1) * 1) })

        // let newCart = {
        //     'sessionId': sessionId.token,
        //     'isEnabled': true,
        //     'isGift': false,
        //     'voucher': null,
        //     'freight': {
        //         'postalCode': null,
        //         'value': '0,0',
        //         'deliveryTime': 0
        //     },
        //     'customer': null,
        //     'products': [{
        //         '_id': mongoose.Types.ObjectId(product._id),
        //         'sku': product.sku,
        //         'title': product.title,
        //         'price': product.price,
        //         'discount': product.discount,
        //         'online': product.online,
        //         'saleable': product.saleable,
        //         'qty': 1,
        //         'images': [{
        //             'name': product.images[0].name
        //         }]
        //     }],
        //     'registrationDate': registrationDate.toLocaleString(),
        //     'changeDate': registrationDate.toLocaleString()
        // }

        let newCart = new Cart()
        newCart.sessionId =  sessionId.token
        newCart.isEnabled =  true
        newCart.isGift = false
        newCart.voucher =  null
        newCart.freight = {
            'postalCode': null,
            'value': '0,0',
            'deliveryTime': 0
        }
        newCart.customer = null
        newCart.products =  [{
            '_id': mongoose.Types.ObjectId(product._id),
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
        }]
        newCart.registrationDate = registrationDate.toLocaleString()
        newCart.changeDate = registrationDate.toLocaleString()

        await manager.send('post', '/cart', newCart)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': sessionId.token, 'isEnabled': true } }))
        renderCart(req, res, cart[0])
    }

    // novo cart e usuário logado
    else if (req.isAuthenticated() && newCart) {
        utils.log('Usuário está logado, será criado novo cart para o usuário!')
        let registrationDate = new Date()
        let product = await manager.find('/product/sku/' + sku)

        // let newCart = {
        //     'sessionId': null,
        //     'isEnabled': true,
        //     'isGift': false,
        //     'voucher': null,
        //     'freight': {
        //         'postalCode': null,
        //         'value': '0,0',
        //         'deliveryTime': 0
        //     },
        //     'customer': { '_id': req.user._id },
        //     'products': [{
        //         '_id': mongoose.Types.ObjectId(product._id),
        //         'sku': product.sku,
        //         'title': product.title,
        //         'price': product.price,
        //         'discount': product.discount,
        //         'online': product.online,
        //         'saleable': product.saleable,
        //         'qty': 1,
        //         'images': [{
        //             'name': product.images[0].name
        //         }]
        //     }],
        //     'registrationDate': registrationDate.toLocaleString(),
        //     'changeDate': registrationDate.toLocaleString()
        // }

        let newCart = new Cart()
        newCart.sessionId =  null
        newCart.isEnabled =  true
        newCart.isGift = false
        newCart.voucher =  null
        newCart.freight = {
            'postalCode': null,
            'value': '0,0',
            'deliveryTime': 0
        }
        newCart.customer = { '_id': req.user._id }
        newCart.products =  [{
            '_id': mongoose.Types.ObjectId(product._id),
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
        }]
        newCart.registrationDate = registrationDate.toLocaleString()
        newCart.changeDate = registrationDate.toLocaleString()

        await manager.send('post', '/cart', newCart)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
        renderCart(req, res, cart[0])
    }

    // cart já existe (usuário logado ou sessão já existente)
    // else if ((req.isAuthenticated() && cart[0] !== undefined) || (!req.isAuthenticated() && req.cookies.sessionId !== undefined && cart[0] !== undefined)) {
    else if (editCart) {

        utils.log('Usuário está logado ou existe cart em sessão e este cart não está vazio!')

        if (addCartItem || updateCartItemQty || removeCartItem) {

            // if (!req.isAuthenticated() && req.cookies.sessionId !== undefined && cart === undefined) {
            //     utils.log('Sessão já existe, usuário não está logado e cart não está vazio!')
            //     cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
            //     console.log('cart: ' + cart[0])
            // } else {
            //     utils.log('Usuário está logado e cart não está vazio!')
            // }

            if (cart[0] !== undefined) {

                utils.log('Verificando se item já existe no cart...')
                let isExists = false
                let count = 0
                let position = 0
                let compare = null
                while (count < cart[0].products.length) {
                    compare = cart[0].products[count].sku.localeCompare(sku)
                    if (compare == 0 && !isExists) {
                        isExists = true
                        position = count
                    }
                    count++
                }

                // item não existe, então add novo item ao cart
                if (!isExists && addCartItem) {
                    utils.log('patch/cart/add/product...')
                    let product = await manager.find('/product/SKU/' + sku)
                    let newItem = {
                        '_id': mongoose.Types.ObjectId(product._id),
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
                    cart[0].products.push(newItem)
                    let newCartItem = {
                        'products': cart[0].products,
                        'changeDate': new Date().toLocaleString()
                    }
                    await manager.send('patch', '/cart/push/' + cart[0]._id, newCartItem)
                    renderCart(req, res, cart[0])
                }

                // item existe, e está sendo add novamente ou a opção de qty foi alterada no cart, então atualiza a quantidade respeitando o limite máximo
                else if (isExists && (addCartItem && cart[0].products[position].qty < process.env.LIMIT_QTY_ITEM_CART || updateCartItemQty && qtyItemCart <= process.env.LIMIT_QTY_ITEM_CART)) {
                    utils.log('patch/cart/update/product...')
                    if (addCartItem)
                        cart[0].products[position].qty++
                    else if (updateCartItemQty)
                        cart[0].products[position].qty = qtyItemCart
                    let updCartItemQty = {
                        'products.$.qty': cart[0].products[position].qty,
                        'changeDate': new Date().toLocaleString()
                    }
                    await manager.send('patch', '/cart/set/' + cart[0]._id + '_' + cart[0].products[position]._id, updCartItemQty)
                    renderCart(req, res, cart[0])
                }

                // item existe, mas já atingiu o limite máximo para o item
                else if (isExists && addCartItem && cart[0].products[position].qty == process.env.LIMIT_QTY_ITEM_CART) {
                    utils.log('patch/cart/update/product/qtyMax...')
                    renderCart(req, res, cart[0])
                }

                // item existe e será removido
                else if (isExists && removeCartItem) {
                    utils.log('patch/cart/remove/product...')
                    let remCartItem = { 'products': { '_id': cart[0].products[position]._id } }
                    await manager.send('patch', '/cart/pull/' + cart[0]._id, remCartItem)
                    cart[0].products.splice(position, 1)
                    renderCart(req, res, cart[0])
                }

                // analisar um pouco mais quais as possibilidades que levam a ocorrer este problema (chegar até aqui)
                else {
                    utils.log('Houve algum problema! (avaliar)')
                    utils.log('Existe o sessionId, cart está vazio e as ações são inválidas (add, update, remove or freight) ')
                    console.log('isExists: ', isExists)
                    console.log('sessionId: ', req.cookies.sessionId)
                    console.log('addCartItem: ', addCartItem)
                    console.log('updateCartItemQty: ', updateCartItemQty)
                    console.log('freightCart: ', freightCart)
                    console.log('sku: ', sku)
                    console.log('cartId: ', cartId)
                    renderCart(req, res, null)
                }
            }
        }
        // calcula o frete caso o cep não tenha sido informado (nova cart) ou cep diferente do informado anteriormente (cart já existente)
        else if (cartId != null && freightCart) {
            utils.log('cart/freight-calculation...')
            let cart = await manager.find('/cart/' + cartId)
            if (cart.freight.postalCode == null || cart.freight.postalCode.localeCompare(postalCode) != 0) {
                let freight = await freightCalculation(postalCode)
                let updateCartPostalCode = { 'freight': { 'postalCode': postalCode, 'value': freight.value, 'deliveryTime': freight.deliveryTime }, 'changeDate': new Date().toLocaleString() }
                await manager.send('patch', '/cart/' + cart._id, updateCartPostalCode)
                cart.freight.postalCode = postalCode
                cart.freight.value = freight.value
                cart.freight.deliveryTime = freight.deliveryTime
                renderCart(req, res, cart)
            }
        } else {
            utils.log('Investigar, a partir deste ponto as ações são inválidas (add, update, remove or freight)')
            console.log('sessionId: ', req.cookies.sessionId)
            console.log('addCartItem: ', addCartItem)
            console.log('updateCartItemQty: ', updateCartItemQty)
            console.log('freightCart: ', freightCart)
            console.log('sku: ', sku)
            console.log('cartId: ', cartId)
            renderCart(req, res, null)
        }
    }
}

let freightCalculation = async (postalCode) => {
    utils.log('freightCalculation()...')
    return new Promise((resolve, reject) => {
        let freight = null
        postalCode = postalCode.replace('-', '')
        let url = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx?wsdl'
        let params = {
            nCdEmpresa: '',
            sDsSenha: '',
            // nCdServico: '04014', // SEDEX
            nCdServico: '04510', // PAC
            sCepOrigem: '93950000',
            sCepDestino: postalCode,
            nVlPeso: '1',
            nCdFormato: 3,
            nVlComprimento: '0',
            nVlAltura: '0',
            nVlLargura: '0',
            nVlDiametro: '0',
            sCdMaoPropria: 'N',
            nVlValorDeclarado: '0',
            sCdAvisoRecebimento: 'N'
        }
        soap.createClient(url, (err, client) => {
            if (err) {
                console.error('Error 1: ' + err)
                // freight = {
                //     'postalCode': postalCode,
                //     'value': '0,0',
                //     'deliveryTime': 0
                // }
                // reject(freight)
            }
            else {
                client.CalcPrecoPrazo(params, (err, result) => {
                    if (err) {
                        console.error('Error 2: ' + err)
                        // freight = {
                        //     'postalCode': postalCode,
                        //     'value': '0,0',
                        //     'deliveryTime': 0
                        // }
                        // reject(freight)
                    }
                    else {
                        // console.log(result.CalcPrecoPrazoResult.Servicos.cServico)
                        freight = {
                            'postalCode': postalCode,
                            'value': result.CalcPrecoPrazoResult.Servicos.cServico[0].Valor,
                            'deliveryTime': result.CalcPrecoPrazoResult.Servicos.cServico[0].PrazoEntrega
                        }
                        resolve(freight)
                    }
                })
            }
        })
    })
}

let findCart = async (req, res, next) => {
    utils.log('findCart()...')
    // busca o cart pelo user e exibe a página do cart (user logged)
    if (req.isAuthenticated()) {
        utils.log('get/cart/find/logged...')
        let cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
        if (cart[0] !== undefined)
            renderCart(req, res, cart[0])
        else
            renderCart(req, res, null)
    } else {
        // SessionId expirou e não existe cart
        if (req.cookies.sessionId === undefined) {
            utils.log('SessionId expirou e não existe cart!')
            renderCart(req, res, null)
        }
        // busca o cart pela session e exibe a página do cart
        else {
            utils.log('get/cart/find/last/session...')
            let cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
            renderCart(req, res, cart[0])
        }
    }
}

module.exports = () => {

    /* FIND CART - SESSION or USER */
    router.get('/cart', (req, res, next) => {
        findCart(req, res, next)
    })

    /* MANAGER CART - ADD, UPDATE, REMOVE and FREIGHT */
    router.post('/cart', (req, res, next) => {
        cartManager(req, res, next)
    })

    return router

}

