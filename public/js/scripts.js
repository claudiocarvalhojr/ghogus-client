const success = 'success';
const info = 'info';
const danger = 'danger';

var webApiDomain = '';
var hostName = location.hostname;

if (hostName === 'localhost') {
    webApiDomain = 'http://localhost:3000/clientes/';
} else {
    webApiDomain = 'http://api.ghogus.com/clientes/';
}

$(document).ready(function () {

    // mask
    $('#btnNewRegister').hide();
    $('#freightCalculation').mask('00000-000');
    $('#birthDate').mask('00/00/0000');
    $('#phoneNumber').mask('(00) 00000-0000');
    $('#price').mask('#.##0,00', { reverse: true });
    // $('#price').mask('R$ 999.990,00');

    // focus e select
    $('#email').focus();
    $('#email').select()

    // focus e select
    $('#firstName').focus();
    $('#firstName').select()

    // focus e select
    $('#sku').focus();
    $('#sku').select()

    $('#btn-search-site').click(function () {
        $('#btn-search-site').hide();
        $('.navbar-search').toggleClass('slideMenu');
        // $('#btn-search-site').css('left','-35px');
        $('#search-site').focus();
    });

    $('#search-site').blur(function () {
        $('#btn-search-site').show();
        $('.navbar-search').toggleClass('slideMenu');
        // $('#btn-search-site').css('left','-150px');
    });

    // $('#btnSiteSearch').focus('click', function () {
    //     $('#btnSiteSearch').css('width', '200px')
    // });
    // $('#btnSiteSearch').blur('click', function () {
    //     $('#btnSiteSearch').css('width', '75px')
    // });

    function alertMessage(id, message) {
        $(id).html(message)
        // $(id).fadeIn(1000).delay(1000).fadeOut(1000);
        $(id).slideDown(1000).delay(1000).slideUp(1000);
        // $(id).slideToggle(1000).delay(1000).slideToggle(1000);
    }
    function alertMessage(id) {
        // $(id).fadeIn(1000).delay(1000).fadeOut(1000);
        $(id).slideDown(1000).delay(1000).slideUp(1000);
        // $(id).slideToggle(1000).delay(1000).slideToggle(1000);
    }
})