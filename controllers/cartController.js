const manager = require('../manager')
const utils = require('../utils')
const mongoose = require('mongoose')
const soap = require('soap')
// const Cart = require('../models/cart')

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
            } else
                total = subtotal
        }
    }
    let resume = {
        'subtotal': subtotal,
        'total': total
    }
    return resume
}

let simpleProduct = (product) => {
    return {
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
}

let addItem = async (req, res) => {
    let itemSku = req.body.itemSku
    utils.log('cartController.addItem(' + itemSku + ')...')
    let registrationDate = new Date()
    let cart = null
    if (req.isAuthenticated())
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
    if (cart === undefined || cart == null || cart == '') {
        let product = await manager.find('/product/sku/' + itemSku)
        let sessionId = null
        let customer = null
        if (!req.isAuthenticated()) {
            let session = await manager.find('/session-id')
            // res.cookie('sessionId', sessionId.token, { maxAge: ((((1000 * 60) * 60) * 24) * 7) })
            res.cookie('sessionId', session.token, { maxAge: ((((1000 * 60) * 1) * 1) * 1) })
            sessionId = session.token
        } else
            customer = { '_id': req.user._id }
        let newCart = {
            'sessionId': sessionId,
            'isEnabled': true,
            'isGift': false,
            'voucher': null,
            'freight': {
                'fallback': null,
                'postalCode': null,
                'value': '0,0',
                'deliveryTime': 0
            },
            'customer': customer,
            'products': [simpleProduct(product)],
            'registrationDate': registrationDate.toLocaleString(),
            'changeDate': registrationDate.toLocaleString()
        }
        await manager.send('post', '/cart', newCart)
        let cart = null
        if (req.isAuthenticated())
            cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
        else
            cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': sessionId, 'isEnabled': true } }))
        if (cart != null)
            renderCart(req, res, cart[0])
        else
            renderCart(req, res, null)
    } else
        addItemOrUpdateItemQty(req, res, cart)
}

let addItemOrUpdateItemQty = async (req, res, cart) => {
    let itemSku = req.body.itemSku
    utils.log('cartController(' + cart[0]._id + ').addItemOrUpdateItemQty(' + itemSku + ')...')
    let position = utils.position(cart[0], itemSku)
    if (position < 0) {
        utils.log('patch/cart/add/product...')
        let product = await manager.find('/product/SKU/' + itemSku)
        cart[0].products.push(simpleProduct(product))
        let newCartItem = {
            'products': cart[0].products,
            'changeDate': new Date().toLocaleString()
        }
        await manager.send('patch', '/cart/push/' + cart[0]._id, newCartItem)
        return renderCart(req, res, cart[0])
    }
    // item existe, e está abaixo da qty máxima, qty será incrementada
    else if (position >= 0 && cart[0].products[position].qty < process.env.LIMIT_QTY_ITEM_CART) {
        utils.log('patch/cart/update/product/qty...')
        cart[0].products[position].qty++
        let updateItemQty = {
            'products': cart[0].products,
            'changeDate': new Date().toLocaleString()
        }
        await manager.send('patch', '/cart/' + cart[0]._id, updateItemQty)
        return renderCart(req, res, cart[0])
    }
    // item existe, mas já atingiu a qty máxima
    else if (position >= 0 && cart[0].products[position].qty == process.env.LIMIT_QTY_ITEM_CART) {
        utils.log('patch/cart/update/product/max...')
        return renderCart(req, res, cart[0])
    }
    renderCart(req, res, null)
}

let updateItemQty = async (req, res) => {
    let cartId = req.body.cartId
    let itemSku = req.body.itemSku
    utils.log('cartController(' + cartId + ').updateItemQty(' + itemSku + ')...')
    let cart = null
    if (req.isAuthenticated())
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
    // let cart = await manager.find('/cart/' + cartId)
    if (cart !== undefined && cart != null || cart != '') {
        let position = utils.position(cart[0], itemSku)
        let itemQty = parseInt(req.body.qty, 10)
        if (position >= 0 && itemQty <= process.env.LIMIT_QTY_ITEM_CART) {
            cart[0].products[position].qty = itemQty
            let updateItemQty = {
                'products': cart[0].products,
                'changeDate': new Date().toLocaleString()
            }
            await manager.send('patch', '/cart/' + cart[0]._id, updateItemQty)
        }
        return renderCart(req, res, cart[0])
    }
    renderCart(req, res, null)
}

let removeItem = async (req, res) => {
    let cartId = req.body.cartId
    let itemSku = req.body.itemSku
    utils.log('cartController(' + cartId + ').removeItem(' + itemSku + ')...')
    let cart = null
    if (req.isAuthenticated())
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
    // let cart = await manager.find('/cart/' + cartId)
    if (cart !== undefined && cart != null || cart != '') {
        let position = utils.position(cart[0], itemSku)
        if (position >= 0) {
            let remove = { 'products': { '_id': cart[0].products[position]._id } }
            await manager.send('patch', '/cart/pull/' + cart[0]._id, remove)
            cart[0].products.splice(position, 1)
        }
        return renderCart(req, res, cart[0])
    }
    renderCart(req, res, null)
}

let freightCalculation = async (req, res) => {
    let cartId = req.body.cartId
    let postalCode = req.body.postalCode
    utils.log('cartController(' + cartId + ').freightCalculation(' + postalCode + ')...')
    let cart = null
    if (req.isAuthenticated())
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
    // let cart = await manager.find('/cart/' + cartId)
    if (cart !== undefined && cart != null || cart != '') {
        if (cart[0].freight.postalCode == null || cart[0].freight.postalCode.localeCompare(postalCode) != 0 || cart[0].freight.fallback == null || cart[0].freight.fallback == true) {
            let freight = await calculation(postalCode)
            let updateCartPostalCode = { 'freight': { 'fallback': freight.fallback, 'postalCode': postalCode, 'value': freight.value, 'deliveryTime': freight.deliveryTime }, 'changeDate': new Date().toLocaleString() }
            await manager.send('patch', '/cart/' + cart[0]._id, updateCartPostalCode)
            cart[0].freight.fallback = freight.fallback
            cart[0].freight.postalCode = postalCode
            cart[0].freight.value = freight.value
            cart[0].freight.deliveryTime = freight.deliveryTime
        }
        return renderCart(req, res, cart[0])
    }
    renderCart(req, res, null)
}

let calculation = async (postalCode) => {
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
                freight = {
                    'fallback': true,
                    'postalCode': postalCode,
                    'value': '25,00',
                    'deliveryTime': 10
                }
                resolve(freight)
            }
            else {
                client.CalcPrecoPrazo(params, (err, result) => {
                    if (err) {
                        console.error('Error 2: ' + err)
                        freight = {
                            'fallback': true,
                            'postalCode': postalCode,
                            'value': '25,00',
                            'deliveryTime': 10
                        }
                        resolve(freight)
                    }
                    else {
                        // console.log(result.CalcPrecoPrazoResult.Servicos.cServico)
                        freight = {
                            'fallback': false,
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

let findCart = async (req, res) => {
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

module.exports = { addItem, updateItemQty, removeItem, freightCalculation, findCart }