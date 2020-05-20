var mongoose = require('mongoose');

module.exports = mongoose.model('Product', {
    id: String,
    sku: String,
    title: String,
    description: String,
    price: String,
    discount: String,
    online: Boolean,
    onlineDate: String,
    sellable: Boolean,
    sellableDate: String,
    images: [Object],
    root: String,
    categories: String,
    subcategories: String,
    registrationDate: String,
    changeDate: String
}); 