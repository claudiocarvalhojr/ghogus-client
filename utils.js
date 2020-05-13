function log(message) {
    let data = new Date()
    let print = true
    if (print) {
        console.log('****************************************')
        console.log(data.toLocaleString() + ' - ' + message)
        // console.log('****************************************')
    }
}

module.exports = { log }