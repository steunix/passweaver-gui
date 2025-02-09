import * as JH from './jh.js'

JH.event('#loginForm', 'submit', () => {
  JH.disable('#login')
  JH.query('#login').innerHTML = 'Loggin in...'
})
