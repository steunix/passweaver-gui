import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as UPicker from './userpicker.js'

function enableSave () {
  if (JH.value('#data') === '') {
    JH.query('#save').setAttribute('disabled', 'disabled')
    return
  }
  if (JH.value('#scope') === '2' && JH.value('#scopeuser') === '') {
    JH.query('#save').setAttribute('disabled', 'disabled')
    return
  }
  JH.query('#save').removeAttribute('disabled')
}

function userChoosen (userid, userdesc) {
  JH.value('#scopeuser', userid)
  JH.value('#scopeuserdesc', userdesc)
  UPicker.hide()
  enableSave()
}

JH.event('#data', 'keyup', async (ev) => {
  enableSave()
})

JH.event('#searchuser', 'click', (ev) => {
  UPicker.show(userChoosen)
})

JH.event('#scope', 'sl-change', (ev) => {
  if (JH.value('#scope') === '2') {
    JH.query('#selectuser').style.visibility = 'visible'
  } else {
    JH.query('#selectuser').style.visibility = 'hidden'
    JH.value('#scopeuser', '')
    JH.value('#scopeuserdesc', '')
  }
  enableSave()
})

JH.event('#save', 'click', async (ev) => {
  const data = {
    _csrf: PW.getCSRFToken(),
    data: JH.value('#data'),
    scope: JH.value('#scope'),
    userid: JH.value('#scopeuser')
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

enableSave()
