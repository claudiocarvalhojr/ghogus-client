var mongoose = require('mongoose')

module.exports = mongoose.model('Cart', {
    id: mongoose.Schema.Types.ObjectId,
    sessionId: String,
    isEnabled: String,
    isGift: String,
    voucher: String,
    freight: Object,
    customer: Object,
    products: [Object],
    registrationDate: String,
    changeDate: String
})