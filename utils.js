function log(message) {
    let data = new Date()
    let print = true
    if (print) {
        console.log('****************************************')
        console.log(data.toLocaleString() + ' - ' + message)
        // console.log('****************************************')
    }
}

function position(cart, sku) {
    let isExists = false
    let count = 0
    let position = 0
    let compare = null
    while (count < cart.products.length) {
        compare = cart.products[count].sku.localeCompare(sku)
        if (compare == 0 && !isExists) {
            isExists = true
            position = count
        }
        count++
    }
    if (!isExists)
        position = -1
    return position
}

function compare(cart, sku) {
    let compare = null
    cart.products.forEach(function (product) {
        if (product.sku.localeCompare(sku) == 0) {
            compare = product   
        }
    })
    return compare
}

module.exports = { log, position, compare }