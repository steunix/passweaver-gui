import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

JH.event('#data', 'keyup', async (ev) => {
  if (JH.value('#data') === '') {
    JH.query('#save').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#save').removeAttribute('disabled')
  }
})

JH.event('#save', 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    data: JH.value('#data')
  }
  const resp = await JH.http('/api/onetimesecret', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value('#link', `${window.location.origin}/onetimesecret/${body.data.token}`)

  JH.query('#result').style.visibility = 'visible'
  PW.showToast('success', 'Link created')
})
