import * as JH from './jh.js'

JH.event('#loginForm', 'submit', () => {
  JH.query('#login').setAttribute('disabled', 'disabled')
  JH.query('#login').innerHTML = 'Loggin in...'
})
