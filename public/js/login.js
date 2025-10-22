import * as JH from './jh.js'

JH.event('#loginForm', 'submit', () => {
  JH.disable('#login')
  JH.disable('#glogin')
  JH.query('#login').innerHTML = 'Loggin in...'
})

JH.event('#glogin', 'click', async () => {
  JH.disable('#login')
  JH.disable('#glogin')
  const viewitem = JH.value('#viewitem')
  const resp = await JH.http(`/login/google/url?${viewitem ? `viewitem=${encodeURIComponent(viewitem)}` : ''}`)
  window.location.href = (await resp.json()).url
})
