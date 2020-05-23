const manager = require('../manager')
const utils = require('../utils')
const mongoose = require('mongoose')
// const Cart = require('../models/cart')

let renderCart = (req, res, cart) => {
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

let itemCart = (product) => {
    return {
        '_id': mongoose.Types.ObjectId(product._id),
        'sku': product.sku,
        'title': product.title,
        'price': product.price,
        'discount': product.discount,
        'online': product.online,
        'sellable': product.sellable,
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
                'isFallback': null,
                'postalCode': null,
                'value': '0,0',
                'deliveryTime': 0,
                'itemsQty': 1
            },
            'customer': customer,
            'products': [itemCart(product)],
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
        cart[0].products.push(itemCart(product))
        let newCartItem = {
            'products': cart[0].products,
            'changeDate': new Date().toLocaleString()
        }
        await manager.send('patch', '/cart/push/' + cart[0]._id, newCartItem)
        if (cart[0].freight.postalCode != null)
            updateCartFreight(req, res, cart)
        else
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
        if (cart[0].freight.postalCode != null)
            updateCartFreight(req, res, cart)
        else
            return renderCart(req, res, cart[0])
    }
    // item existe, mas já atingiu a qty máxima
    else if (position >= 0 && cart[0].products[position].qty == process.env.LIMIT_QTY_ITEM_CART) {
        utils.log('patch/cart/update/product/max...')
        return renderCart(req, res, cart[0])
    } else
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
            if (cart[0].freight.postalCode != null)
                updateCartFreight(req, res, cart)
            else
                renderCart(req, res, cart[0])
        }
        else
            renderCart(req, res, cart[0])
    }
    else
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
            if (cart[0].freight.postalCode != null)
                updateCartFreight(req, res, cart)
            else
                renderCart(req, res, cart[0])
        }
        else
            renderCart(req, res, cart[0])
    }
    else
        renderCart(req, res, null)
}

let cartFreight = async (req, res) => {
    let cart = null
    let cartId = req.body.cartId
    let postalCode = req.body.postalCode.replace('-', '')
    if (req.isAuthenticated())
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isEnabled': true } }))
    else if (!req.isAuthenticated() && req.cookies.sessionId !== undefined)
        cart = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isEnabled': true } }))
    // cart = await manager.find('/cart/' + cartId)
    if (cart !== undefined && cart != null && cart != '') {
        let itemsQty = 0
        if (cart[0].products.length > 0) {
            cart[0].products.forEach(function (product) {
                itemsQty += product.qty
            })
        }

        console.log('postalCode (cart): ' + cart[0].freight.postalCode)
        console.log('postalCode (atual): ' + postalCode)
        console.log('itemsQty (cart): ' + cart[0].freight.itemsQty)
        console.log('itemsQty (atual): ' + itemsQty)
        console.log('cart[0].freight.isFallback: ' + cart[0].freight.isFallback)

        utils.log('cartController(' + cartId + ').cartFreight(' + postalCode + ',' + itemsQty + ')...')
        if ((cart[0].freight.isFallback == null && postalCode != null) ||
            (cart[0].freight.isFallback == true && postalCode != null) ||
            (cart[0].freight.postalCode == null && postalCode != null) ||
            (cart[0].freight.postalCode != null && postalCode != null && cart[0].freight.itemsQty != itemsQty) ||
            (cart[0].freight.postalCode != null && postalCode != null && cart[0].freight.postalCode.localeCompare(postalCode) != 0)) {
            let freight = await manager.freightCalculation(postalCode, itemsQty)
            let updateCartFreight = {
                'freight': {
                    'isFallback': freight.isFallback,
                    'postalCode': freight.postalCode,
                    'value': freight.value,
                    'deliveryTime': freight.deliveryTime,
                    'itemsQty': freight.itemsQty
                },
                'changeDate': new Date().toLocaleString()
            }
            await manager.send('patch', '/cart/' + cart[0]._id, updateCartFreight)
            cart[0].freight = freight
            renderCart(req, res, cart[0])
        }
        else
            renderCart(req, res, cart[0])
    }
    else
        renderCart(req, res, null)
}

let updateCartFreight = async (req, res, cart) => {
    let cartId = cart[0]._id
    let postalCode = cart[0].freight.postalCode
    if (cart !== undefined && cart != null && cart != '') {
        let itemsQty = 0
        if (cart[0].products.length > 0) {
            cart[0].products.forEach(function (product) {
                itemsQty += product.qty
            })
        }
        utils.log('cartController(' + cartId + ').updateCartFreight(' + postalCode + ',' + itemsQty + ')...')
        if ((postalCode != null && cart[0].freight.isFallback == null) || 
            (postalCode != null && cart[0].freight.isFallback == true) || 
            (postalCode != null && cart[0].freight.itemsQty != itemsQty)) {
            let freight = await manager.freightCalculation(postalCode, itemsQty)
            let updateCartPostalCode = {
                'freight': {
                    'isFallback': freight.isFallback, 
                    'postalCode': freight.postalCode, 
                    'value': freight.value, 
                    'deliveryTime': freight.deliveryTime, 
                    'itemsQty': freight.itemsQty 
                }, 
                'changeDate': new Date().toLocaleString() 
            }
            await manager.send('patch', '/cart/' + cart[0]._id, updateCartPostalCode)
            cart[0].freight = freight
            renderCart(req, res, cart[0])
        }
        else
            renderCart(req, res, cart[0])
    }
    else
        renderCart(req, res, null)
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
            if (cart[0] !== undefined)
                renderCart(req, res, cart[0])
            else
                renderCart(req, res, null)
        }
    }
}

module.exports = { renderCart, addItem, updateItemQty, removeItem, cartFreight, findCart }