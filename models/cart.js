var mongoose = require('mongoose')

module.exports = mongoose.model('Cart', {
    id: String,
    sessionId: String,
    isEnabled: Boolean,
    isGift: Boolean,
    voucher: String,
    freight: Object,
    customer: Object,
    products: [Object],
    registrationDate: String,
    changeDate: String
})