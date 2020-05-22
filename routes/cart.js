const express = require('express')
const router = express.Router()
const cartController = require('../controllers/cartController')

module.exports = () => {

    /* FIND CART - (SESSION or LOGGED) */
    router.get('/cart', (req, res, next) => {
        cartController.findCart(req, res)
    })

    router.post('/cart', (req, res, next) => {

        /* ADD ITEM */
        if (req.body.action.localeCompare('add') == 0)
            cartController.addItem(req, res)

        /* UPDATE QTY ITEM */
        else if (req.body.action.localeCompare('update') == 0)
            cartController.updateItemQty(req, res)

        /* REMOVE ITEM */
        else if (req.body.action.localeCompare('remove') == 0)
            cartController.removeItem(req, res)

        /* CALC FREIGHT */
        else if (req.body.action.localeCompare('freight') == 0)
            cartController.cartFreight(req, res, null, true)

    })

    return router

}

