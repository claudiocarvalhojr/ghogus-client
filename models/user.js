var mongoose = require('mongoose');

module.exports = mongoose.model('User', {
    id: String,
    email: String,
    password: String,
    birthDate: String,
    phoneNumber: String,
    firstName: String,
    lastName: String,
    registrationDate: String,
    changeDate: String,
}); 