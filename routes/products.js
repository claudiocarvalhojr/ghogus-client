const express = require('express')
const router = express.Router()
const manager = require('../manager')
const productController = require('../controllers/productController')

module.exports = () => {

    /* FORM PRODUCT */
    router.get('/produtos/form', manager.isAuthenticated, (req, res, next) => {
        productController.productManager(req, res, 'form')
    })

    /* SAVE PRODUCT */
    router.post('/produtos/save', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        productController.productManager(req, res, 'save')
    })

    /* FIND PRODUCT */
    router.get('/produto/sku/:sku', (req, res, next) => {
        productController.productManager(req, res, 'find')
    })

    /* LIST PRODUCTS */
    router.get('/produtos/list', manager.isAuthenticated, manager.isTokenValid, (req, res, next) => {
        productController.productManager(req, res, 'list')
    })

    return router

}