var mongoose = require('mongoose');

module.exports = mongoose.model('Product', {
    id: mongoose.Schema.Types.ObjectId,
    sku: String,
    title: String,
    description: String,
    price: String,
    discount: String,
    online: Boolean,
    onlineDate: String,
    saleable: Boolean,
    saleableDate: String,
    images: [Object],
    root: String,
    categories: String,
    subcategories: String,
    registrationDate: String,
    changeDate: String
}); 