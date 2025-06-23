import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as CPicker from './picker.js'

const domCache = {
  scopeInput: JH.query('#scope'),
  scopeUserInput: JH.query('#scopeuser'),
  userDescInput: JH.query('#scopeuserdesc'),
  userSelectButton: JH.query('#searchuser'),
  userSelectDiv: JH.query('#selectuser'),
  saveButton: JH.query('#save'),
  dataInput: JH.query('#data'),
  link: JH.query('#link'),
  resultDiv: JH.query('#result')
}

function enableSave () {
  if (JH.value(domCache.dataInput) === '') {
    JH.disable(domCache.saveButton)
    return
  }
  if (JH.value(domCache.scopeInput) === '2' && JH.value(domCache.scopeUserInput) === '') {
    JH.disable(domCache.saveButton)
    return
  }
  JH.enable(domCache.saveButton)
}

function userChoosen (userid, userdesc) {
  JH.value(domCache.scopeUserInput, userid)
  JH.value(domCache.userDescInput, userdesc)
  UPicker.hide()
  enableSave()
}

JH.event(domCache.dataInput, 'keyup', async (ev) => {
  enableSave()
})

JH.event(domCache.userSelectButton, 'click', (ev) => {
  UPicker.show()
})

JH.event(domCache.scopeInput, 'sl-change', (ev) => {
  if (JH.value(domCache.scopeInput) === '2') {
    domCache.userSelectDiv.style.visibility = 'visible'
  } else {
    domCache.userSelectDiv.style.visibility = 'hidden'
    JH.value(domCache.scopeUserInput, '')
    JH.value(domCache.userDescInput, '')
  }
  enableSave()
})

JH.event(domCache.saveButton, 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    data: JH.value(domCache.dataInput),
    scope: JH.value(domCache.scopeInput),
    userid: JH.value(domCache.scopeUserInput)
  }

  const resp = await JH.http('/api/onetimesecret', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value(domCache.link, body.data.link)

  domCache.resultDiv.style.visibility = 'visible'
  PW.showToast('success', 'Link created')
})

enableSave()

// Picker
const UPicker = new CPicker.Picker('users', userChoosen)
