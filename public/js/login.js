import * as JH from './jh.js'

JH.event('#loginForm', 'submit', () => {
  JH.disable('#login')
  JH.query('#login').innerHTML = 'Loggin in...'
})

JH.event('#glogin', 'click', async () => {
  const resp = await JH.http(`/login/google/url?viewitem=${JH.value('#viewitem')}`)
  window.location.href = (await resp.json()).url
})
