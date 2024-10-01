/* global jhEvent, jhQuery */

jhEvent('#loginForm', 'submit', () => {
  jhQuery('#login').setAttribute('disabled', 'disabled')
  jhQuery('#login').innerHTML = 'Loggin in...'
})
