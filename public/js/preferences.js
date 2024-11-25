/* global location */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const resp = await JH.http('/api/preferences')
await PW.checkResponse(resp)

const body = await resp.json()
for (const setting of body.data) {
  if (setting.setting === 'theme') {
    JH.value('#theme', setting.value)
  }
}

JH.event('#save', 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    theme: JH.value('#theme')
  }
  const resp = await JH.http('/api/preferences', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Preferences saved')
  location.reload()
})

JH.event('#newpassword1,#newpassword2', 'keyup', async (ev) => {
  if (JH.value('#newpassword1') !== JH.value('#newpassword2') || JH.value('#newpassword1').length < 8) {
    JH.attribute('#passwordchange', 'disabled', 'disabled')
  } else {
    JH.query('#passwordchange').removeAttribute('disabled')
  }
})

JH.event('#passwordchange', 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value('#newpassword1')
  }
  const resp = await JH.http('/api/changepassword', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Password successfully changed')
  location.reload()
})

JH.event('#pnewpassword1,#pnewpassword2', 'keyup', async (ev) => {
  if (JH.value('#pnewpassword1') !== JH.value('#pnewpassword2') || JH.value('#pnewpassword1').length < 8) {
    JH.attribute('#ppasswordchange', 'disabled', 'disabled')
  } else {
    JH.query('#ppasswordchange').removeAttribute('disabled')
  }
})

JH.event('#ppasswordchange', 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value('#pnewpassword1')
  }
  const resp = await JH.http('/api/personalpasswordchange', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Password successfully changed')
  location.reload()
})
