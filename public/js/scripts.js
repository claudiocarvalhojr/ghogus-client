const success = 'success'
const info = 'info'
const danger = 'danger'

var webApiDomain = ''
var hostName = location.hostname;

if (hostName === 'localhost') {
    webApiDomain = 'http://localhost:3000/clientes/'
} else {
    webApiDomain = 'http://api.ghogus.com/clientes/'
}

$(document).ready(function () {
    function alertMessage(id, message) {
        $(id).html(message)
        // $(id).fadeIn( 1000 ).delay( 1000 ).fadeOut(1000)
        $(id).slideDown( 1000 ).delay( 1000 ).slideUp(1000)
        // $(id).slideToggle( 1000 ).delay( 1000 ).slideToggle( 1000 )
    }
    function alertMessage(id) {
        // $(id).fadeIn( 1000 ).delay( 1000 ).fadeOut(1000)
        $(id).slideDown( 1000 ).delay( 1000 ).slideUp(1000)
        // $(id).slideToggle( 1000 ).delay( 1000 ).slideToggle( 1000 )
    }
})
