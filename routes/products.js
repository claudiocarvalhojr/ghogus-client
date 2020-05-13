const utils = require('../utils');
const manager = require('../manager');
const express = require('express')
const router = express.Router()

let renderProduct = (req, res, product) => {
    utils.log('renderProduct(' + product.sku + ')...')
    if (req.isAuthenticated()) {
        return res.render('index', {
            page: './templates/product',
            title: process.env.APP_TITLE,
            menu: 'full',
            product: product
        })
    }
    return res.render('index', {
        page: './templates/product',
        title: process.env.APP_TITLE,
        menu: 'small',
        product: product
    })
}

let productManager = async (req, res, action) => {
    utils.log('productManager(' + action + ')...')
    if (action === 'form') {
        utils.log('get/product/form...')
        let date = new Date()
        let dateForm = date.getFullYear() + '-' + ('0' + (date.getMonth())).slice(-2) + '-' + date.getDate() + 'T' + date.toLocaleTimeString()
        res.render('index', {
            page: './templates/products/form',
            title: process.env.APP_TITLE,
            menu: 'full',
            date: dateForm,
            message: null
        })
    } else if (action === 'save') {
        utils.log('post/products...')
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
        let product = {
            'sku': req.body.sku,
            'title': req.body.title,
            'description': req.body.description,
            'price': price,
            'discount': discount,
            'online': online,
            'onlineDate': onlineDate.toLocaleString(),
            'saleable': saleable,
            'saleableDate': saleableDte.toLocaleString(),
            'indexable': true,
            'images': [{
                'name': req.body.image
            }],
            'root': null,
            'categories': null,
            'subcategories': null,
            'registrationDate': registrationDate.toLocaleString(),
            'changeDate': registrationDate.toLocaleString()
        }
        let result = await manager.send('post', '/product?token=' + req.session.token, product)
        return res.render('index', {
            page: './templates/products/success',
            title: process.env.APP_TITLE,
            menu: 'full',
            message: result.message
        })
    } else if (action === 'find') {
        utils.log('get/product/sku...')
        product = await manager.find('/product/sku/' + req.params.sku)
        renderProduct(req, res, product)
    } else if (action === 'list') {
        utils.log('get/products/list...')
        let products = await manager.find('/products?token=' + req.session.token)
        return res.render('index', {
            page: './templates/products/list',
            title: process.env.APP_TITLE,
            menu: 'full',
            products: products
        })
    }
}

module.exports = () => {

    /* FORM PRODUCT */
    router.get('/produtos/form', manager.isAuthenticated, (req, res, next) => {
        productManager(req, res, 'form')
    })

    /* SAVE PRODUCT */
    router.post('/produtos/save', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        productManager(req, res, 'save')
    })

    /* FIND PRODUCT */
    router.get('/produto/sku/:sku', (req, res, next) => {
        productManager(req, res, 'find')
    })

    /* LIST PRODUCTS */
    router.get('/produtos/list', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        productManager(req, res, 'list')
    })

    return router

}