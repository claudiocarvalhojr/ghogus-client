const express = require('express')
const router = express.Router()
const cartController = require('../controllers/cartController')

module.exports = () => {

    /* FIND CART - (SESSION or LOGGED) */
    router.get('/cart', (req, res, next) => {
        cartController.findCart(req, res)
    })

    /* ADD ITEM */
    router.post('/cart', (req, res, next) => {
        // cartController.cartManager(req, res, 'add')
        if (req.body.action.localeCompare('add') == 0)
            cartController.addItem(req, res)
        else if (req.body.action.localeCompare('update') == 0)
            cartController.cartManager(req, res)
        else if (req.body.action.localeCompare('remove') == 0)
            cartController.cartManager(req, res)
        else if (req.body.action.localeCompare('freight') == 0)
            cartController.freightCalculation(req, res)
    })

    // /* UPDATE ITEM */
    // router.post('/cart/item/update', (req, res, next) => {
    //     cartController.cartManager(req, res, 'update')
    // })

    // /* REMOVE ITEM */
    // router.post('/cart/item/remove', (req, res, next) => {
    //     cartController.cartManager(req, res, 'remove')
    // })

    // /* CALC FREIGHT */
    // router.post('/cart/freight', (req, res, next) => {
    //     cartController.cartManager(req, res, 'freight')
    // })

    return router

}

