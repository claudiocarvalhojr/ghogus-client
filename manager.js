const fetch = require('node-fetch')
const utils = require('./utils')
const soap = require('soap')
const API_GATEWAY = process.env.API_GATEWAY

let isAuthenticated = (req, res, next) => {
    utils.log('manager.isAuthenticated()...')
    if (req.isAuthenticated())
        return next()
    res.redirect('/')
}

var isNotAuthenticated = (req, res, next) => {
    utils.log('manager.isNotAuthenticated()...')
    if (!req.isAuthenticated())
        return next()
    res.redirect('/')
}

let isTokenValid = async (req, res, next) => {
    utils.log('manager.isTokenValid()...')
    let result = await find('/check?token=' + req.session.token)
    if (result.auth) {
        return next()
    }
    req.session.token = null
    req.logout()
    // res.redirect('/')
    // res.redirect('/logout')
    if (req.session.register) {
        req.session.register = false
        return res.render('index', {
            page: './templates/login/form',
            title: APP_TITLE,
            menu: 'small',
            message: null
        })
    }
    res.render('index', {
        page: './templates/login/form',
        title: APP_TITLE,
        menu: 'small',
        message: 'Sua sessão expirou!'
    })
}

function renderPageError(res, codeError) {
    utils.log('manager.problem()...')
    if (req.isAuthenticated()) {
        return res.render('index', {
            page: './templates/structure/error',
            title: APP_TITLE,
            menu: 'full',
            code_error: codeError
        })
    }
    res.render('index', {
        page: './templates/structure/error',
        title: APP_TITLE,
        menu: 'small',
        code_error: codeError
    })
}

let checkStatus = (res) => {
    utils.log('manager.checkStatus(' + res.status + ')...')
    if (res.ok)
        return res
    else {
        utils.log('CODE: ' + res.status + ', TEXT: ' + res.statusText)
        renderPageError(res, res.status)
    }
}

let find = async (url) => {
    utils.log('manager.find(' + url + ')...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url)
                .then(checkStatus)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

let send = async (method, url, params) => {
    utils.log('manager.send(' + method + ')...')
    return new Promise(resolve => {
        resolve(
            fetch(API_GATEWAY + url, {
                method: method,
                body: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(checkStatus)
                .then(res => res.json())
                // .then(json => console.log('RESULT: ' + json))
                .catch(err => console.error('ERROR: ' + err))
        )
    })
}

let freightCalculation = async (postalCode, itemsQty) => {
    utils.log('manager.freightCalculation(' + postalCode + ',' + itemsQty + ')...')
    return new Promise((resolve, reject) => {
        let freight = null
        if (postalCode != null)
            postalCode = postalCode.replace('-', '')
        let url = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx?wsdl'
        let params = {
            nCdEmpresa: '',
            sDsSenha: '',
            // nCdServico: '04014', // SEDEX
            nCdServico: '04510', // PAC
            sCepOrigem: '93950000',
            sCepDestino: postalCode,
            nVlPeso: itemsQty.toString(),
            nCdFormato: 3,
            nVlComprimento: '0',
            nVlAltura: '0',
            nVlLargura: '0',
            nVlDiametro: '0',
            sCdMaoPropria: 'N',
            nVlValorDeclarado: '0',
            sCdAvisoRecebimento: 'N'
        }
        soap.createClient(url, (err, client) => {
            if (err) {
                console.error('Error 1: ' + err)
                freight = fallbackFreight(postalCode, itemsQty)
                resolve(freight)
            }
            else {
                client.CalcPrecoPrazo(params, (err, result) => {
                    if (err) {
                        console.error('Error 2: ' + err)
                        freight = fallbackFreight(postalCode, itemsQty)
                        resolve(freight)
                    }
                    else {
                        // console.log(result.CalcPrecoPrazoResult.Servicos.cServico)
                        freight = {
                            'isFallback': false,
                            'postalCode': postalCode,
                            'value': result.CalcPrecoPrazoResult.Servicos.cServico[0].Valor,
                            'deliveryTime': result.CalcPrecoPrazoResult.Servicos.cServico[0].PrazoEntrega,
                            'itemsQty': itemsQty
                        }
                        resolve(freight)
                    }
                })
            }
        })
    })
}

let fallbackFreight = (postalCode, itemsQty) => {
    utils.log('manager.fallbackFreight(' + postalCode + ',' + itemsQty + ')...')
    return {
        'isFallback': true,
        'postalCode': postalCode,
        'value': '25,00',
        'deliveryTime': 10,
        'itemsQty': itemsQty
    }
}

module.exports = { isAuthenticated, isNotAuthenticated, isTokenValid, renderPageError, find, send, freightCalculation }