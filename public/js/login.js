import * as JH from './jh.js'

JH.event('#loginForm', 'submit', () => {
  JH.disable('#login')
  JH.disable('#glogin')
  JH.query('#loggingdialog').open = true
})

JH.event('#glogin', 'click', async () => {
  JH.disable('#login')
  JH.disable('#glogin')
  JH.query('#loggingdialog').open = true
  const viewitem = JH.value('#viewitem')
  const viewfolder = JH.value('#viewfolder')
  const resp = await JH.http(`/login/google/url?${viewitem ? `viewitem=${encodeURIComponent(viewitem)}` : ''}${viewfolder ? `&viewfolder=${encodeURIComponent(viewfolder)}` : ''}`)
  window.location.href = (await resp.json()).url
})
