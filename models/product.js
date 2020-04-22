var mongoose = require('mongoose');

module.exports = mongoose.model('Product', {
    id: String,
    sku: String,
    title: String,
    description: String,
    price: String,
    discount: String,
    saleable: Boolean,
    online: Boolean,
    saleableDate: String,
    onlineDate: String,
    registerDate: String,
    Images: [Object]
}); 