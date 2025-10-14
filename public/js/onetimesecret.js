import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as CPicker from './picker.js'

const domCache = {
  scopeInput: JH.query('#scope'),
  scopeUserInput: JH.query('#scopeuser'),
  userDescInput: JH.query('#scopeuserdesc'),
  userSelectButton: JH.query('#searchuser'),
  userSelectDiv: JH.query('#selectuser'),
  createLinkButton: JH.query('#save'),
  dataInput: JH.query('#data'),
  link: JH.query('#link'),
  resultDiv: JH.query('#result')
}

function enableSave () {
  if (JH.value(domCache.dataInput) === '') {
    JH.disable(domCache.createLinkButton)
    return
  }
  if (JH.value(domCache.scopeInput) === '2' && JH.value(domCache.scopeUserInput) === '') {
    JH.disable(domCache.createLinkButton)
    return
  }
  JH.enable(domCache.createLinkButton)
}

function userChoosen (userid, userdesc) {
  JH.value(domCache.scopeUserInput, userid)
  JH.value(domCache.userDescInput, userdesc)
  UPicker.hide()
  enableSave()
}

function linkShow () {
  domCache.resultDiv.style.display = 'block'
}

function linkHide () {
  domCache.resultDiv.style.display = 'none'
}

async function createLink () {
  const data = {
    _csrf: PW.getCSRFToken(),
    data: JH.value(domCache.dataInput),
    scope: JH.value(domCache.scopeInput),
    userid: JH.value(domCache.scopeUserInput)
  }

  const resp = await JH.http(`/${PW.getUser() === '' ? 'noauth' : 'api'}/onetimesecret`, data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value(domCache.link, body.data.link)
  linkShow()

  PW.showToast('success', 'Link created')
}

JH.event(domCache.dataInput, 'keyup', async (ev) => {
  enableSave()
})

JH.event(domCache.userSelectButton, 'click', (ev) => {
  UPicker.show()
})

JH.event(domCache.scopeInput, 'change', (ev) => {
  if (JH.value(domCache.scopeInput) === '2') {
    domCache.userSelectDiv.style.display = 'flex'
  } else {
    domCache.userSelectDiv.style.display = 'none'
    JH.value(domCache.scopeUserInput, '')
    JH.value(domCache.userDescInput, '')
  }
  linkHide()
  enableSave()
})

JH.event(domCache.createLinkButton, 'click', createLink)

linkHide()

setTimeout(enableSave, 100)

// Picker
const UPicker = new CPicker.Picker('users', userChoosen)
