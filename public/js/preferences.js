/* global location */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  themeInput: JH.query('#theme'),
  savePrefButton: JH.query('#save'),
  newPassword1: JH.query('#newpassword1'),
  newPassword2: JH.query('#newpassword2'),
  passwordChangeButton: JH.query('#passwordchange'),
  persNewPassword1: JH.query('#pnewpassword1'),
  persNewPassword2: JH.query('#pnewpassword2'),
  persPasswordChangeButton: JH.query('#ppasswordchange')
}

const resp = await JH.http('/api/preferences')
await PW.checkResponse(resp)

const body = await resp.json()
for (const setting of body.data) {
  if (setting.setting === 'theme') {
    JH.value(domCache.themeInput, setting.value)
    break
  }
}

JH.event(domCache.savePrefButton, 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    theme: JH.value(domCache.themeInput)
  }
  const resp = await JH.http('/api/preferences', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Preferences saved')
  location.reload()
})

JH.event([domCache.newPassword1, domCache.newPassword2], 'keyup', async (ev) => {
  if (JH.value(domCache.newPassword1) !== JH.value(domCache.newPassword2) || JH.value(domCache.newPassword1).length < 8) {
    JH.disable(domCache.passwordChangeButton)
  } else {
    JH.enable(domCache.passwordChangeButton)
  }
})

JH.event(domCache.passwordChangeButton, 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value(domCache.newPassword1)
  }
  const resp = await JH.http('/api/changepassword', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Password successfully changed')
  location.reload()
})

JH.event([domCache.persNewPassword1, domCache.persNewPassword2], 'keyup', async (ev) => {
  if (JH.value(domCache.persNewPassword1) !== JH.value(domCache.persNewPassword2) || JH.value(domCache.persNewPassword1).length < 8) {
    JH.disable(domCache.persPasswordChangeButton)
  } else {
    JH.enable(domCache.persPasswordChangeButton)
  }
})

JH.event(domCache.persPasswordChangeButton, 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value(domCache.persNewPassword1)
  }
  const resp = await JH.http('/api/personalpasswordchange', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Password successfully changed')
  location.reload()
})
