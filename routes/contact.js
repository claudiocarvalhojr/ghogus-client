const express = require('express')
const router = express.Router()

const APP_TITLE = process.env.APP_TITLE

function log(message) {
    var data = new Date()
    console.log('****************************************')
    console.log(data.toLocaleDateString() + ' ' + data.toLocaleTimeString() + ' - ' + message)
    // console.log('****************************************')
}

/* CONTATO */
router.get('/', (req, res, next) => {
    log('client/contact...')
    res.render('index', {
        page: 'contact',
        title: APP_TITLE,
        name: req.session.user
    })
})

module.exports = router