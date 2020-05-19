var mongoose = require('mongoose')

module.exports = mongoose.model('Image', {
    id: mongoose.Schema.Types.ObjectId,
    name: String
})