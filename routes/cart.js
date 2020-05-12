const utils = require('../utils');
const manager = require('../manager');
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const soap = require('soap');
const LIMIT_QTY_ITEM_CART = process.env.LIMIT_QTY_ITEM_CART

let renderCart = async (req, res, cart) => {
    utils.log('renderCart...')
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
    utils.log('cartResume...')
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
    utils.log('cartManager...')
    let registrationDate = new Date()
    let user = req.user
    let sku = null
    let cartId = null
    let addCartItem = false
    let updateCartItemQty = false
    let qtyItemCart = 0
    let removeCartItem = false
    let freightCart = false
    let postalCode = null
    if (req.body.addCartItemSKU !== undefined) {
        sku = req.body.addCartItemSKU
        addCartItem = true
    }
    else if (req.body.updateCartItemQtySKU !== undefined) {
        sku = req.body.updateCartItemQtySKU
        updateCartItemQty = true
        qtyItemCart = req.body.qty
    }
    else if (req.body.removeCartItemSKU != undefined) {
        sku = req.body.removeCartItemSKU
        removeCartItem = true
    }
    else if (req.body.freightCartId != undefined) {
        cartId = req.body.freightCartId
        freightCart = true
        postalCode = req.body.postalCode
    }
    // console.log('sessionId: ', req.cookies.sessionId)
    console.log('add: ', addCartItem)
    console.log('update: ', updateCartItemQty)
    console.log('remove: ', removeCartItem)
    console.log('freight: ', freightCart)
    // console.log('postalCode: ', postalCode)
    // console.log('sku: ', sku)
    // console.log('cartId: ', cartId)
    if (req.cookies.sessionId === undefined) {
        utils.log('there is no sessionId!')
        if (addCartItem) {

            let sessionId = await manager.find('/session-id')
            // res.cookie('sessionId', sessionId.token, { maxAge: ((((1000 * 60) * 60) * 24) * 7) })
            res.cookie('sessionId', sessionId.token, { maxAge: ((((1000 * 60) * 1) * 1) * 1) })
        
            let product = await manager.find('/product/sku/' + sku)

            if (user !== undefined)
                user = { '_id': user._id }
            else
                user = null

            let newCart = {
                'sessionId': sessionId.token,
                'isActive': true,
                'isGift': false,
                'voucher': null,
                'freight': {
                    'postalCode': null,
                    'value': '0,0',
                    'deliveryTime': 0
                },
                'customer': user,
                'products': [{
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
                }],
                'registrationDate': registrationDate.toLocaleString(),
                'changeDate': registrationDate.toLocaleString()
            }
            await manager.send('post', '/cart', newCart)
            carts = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': sessionId.token, 'isActive': true }}))
            req.cart = carts[0]
            renderCart(req, res, carts[0])
        } else {
            utils.log('Não existe sessionId e as ações são inválidas (update, remove or freight)')
            console.log('sessionId: ', req.cookies.sessionId)
            console.log('addCartItem: ', addCartItem)
            console.log('updateCartItemQty: ', updateCartItemQty)
            console.log('freightCart: ', freightCart)
            console.log('sku: ', sku)
            console.log('cartId: ', cartId)
            renderCart(req, res, null)
        }
    } else {
        utils.log('sessionId already exists!')
        if (addCartItem == true || updateCartItemQty == true || removeCartItem == true) {
            let carts = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isActive': true }}))
            let isExists = false
            let count = 0
            let position = 0
            let compare = null
            while (count < carts[0].products.length) {
                compare = carts[0].products[count].sku.localeCompare(sku)
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
                let newProduct = {
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
                carts[0].products.push(newProduct)
                let newCartItem = {
                    'products': carts[0].products,
                    'changeDate': new Date().toLocaleString()
                }
                await manager.send('patch', '/cart/push/' + carts[0]._id, newCartItem)
                renderCart(req, res, carts[0])
            }
            // item existe, e está sendo add novamente ou a opção de qty foi alterada no cart, então atualiza a quantidade respeitando o limite máximo
            else if (isExists && (addCartItem && carts[0].products[position].qty < LIMIT_QTY_ITEM_CART || updateCartItemQty && qtyItemCart <= LIMIT_QTY_ITEM_CART)) {
                utils.log('patch/cart/update/product...')
                if (addCartItem)
                    carts[0].products[position].qty++
                else if (updateCartItemQty)
                    carts[0].products[position].qty = qtyItemCart
                let updCartItemQty = {
                    'products.$.qty': carts[0].products[position].qty,
                    'changeDate': new Date().toLocaleString()
                }
                await manager.send('patch', '/cart/set/' + carts[0]._id + '_' + carts[0].products[position]._id, updCartItemQty)
                renderCart(req, res, carts[0])
            }
            // item existe e será removido
            else if (isExists && removeCartItem) {
                utils.log('patch/cart/remove/product...')
                let remCartItem = { 'products': { '_id': carts[0].products[position]._id } }
                await manager.send('patch', '/cart/pull/' + carts[0]._id, remCartItem)
                carts[0].products.splice(position, 1)
                renderCart(req, res, carts[0])
            }
            // item existe, mas já atingiu o limite máximo para o item
            else if (isExists && addCartItem && carts[0].products[position].qty == LIMIT_QTY_ITEM_CART) {
                utils.log('patch/cart/update/product/qtyMax...')
                renderCart(req, res, carts[0])
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
        // 
        else if (freightCart) {
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
            // else  { console.log('ceps iguais: ' + cart.freight.postalCode + ' | ' + postalCode) }
        } else {
            utils.log('O sessionId expirou e as ações são inválidas (add, update, remove or freight)')
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
    utils.log('freightCalculation...')
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
    utils.log('get/cart...')
    // busca o cart pelo user e exibe a página do cart (user logged)
    if (req.isAuthenticated()) {
        utils.log('get/cart/search/logged...')
        let carts = await manager.find('/cart/last/' + JSON.stringify({ values: { 'customer._id': req.user._id, 'isActive': true }}))
        if (carts[0] !== undefined)
            renderCart(req, res, carts[0])
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
            utils.log('get/cart/last/session...')
            let carts = await manager.find('/cart/last/' + JSON.stringify({ values: { 'sessionId': req.cookies.sessionId, 'isActive': true }}))
            renderCart(req, res, carts[0])
        }
    }
}

module.exports = () => {

    /* FIND CART */
    router.get('/cart', (req, res, next) => {
        findCart(req, res, next)
    })

    /* CREATE CART - ADD, UPDATE, REMOVE and FREIGHT */
    router.post('/cart', (req, res, next) => {
        cartManager(req, res, next)
    })

    return router

}

