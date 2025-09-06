import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  readOnlyStatus: JH.query('#readonlystatus'),
  readOnlySetButton: JH.query('#readonlymode'),
  readOnlyUnsetButton: JH.query('#readwritemode'),
  systemLockStatus: JH.query('#systemlockstatus'),
  systemLockSetButton: JH.query('#systemlock'),
  systemLockUnsetButton: JH.query('#systemunlock'),
  clearCacheButton: JH.query('#clearcache'),
  itemTypeNewButton: JH.query('#additemtype')
}

async function fillStatuses () {
  const resp1 = await JH.http('/api/systemlockstatus')
  const resp2 = await JH.http('/api/readonlystatus')

  const body1 = await resp1.json()
  const body2 = await resp2.json()

  if (body1.data.locked) {
    domCache.systemLockStatus.innerHTML = 'System is locked'
    domCache.systemLockStatus.setAttribute('variant', 'danger')
  } else {
    domCache.systemLockStatus.innerHTML = 'System is unlocked'
    domCache.systemLockStatus.setAttribute('variant', 'success')
  }

  if (body2.data.readonly) {
    domCache.readOnlyStatus.innerHTML = 'System is in read-only mode'
    domCache.readOnlyStatus.setAttribute('variant', 'danger')
  } else {
    domCache.readOnlyStatus.innerHTML = 'System is in read-write mode'
    domCache.readOnlyStatus.setAttribute('variant', 'success')
  }
}

await fillStatuses()

async function clearCache () {
  const data = {
    _csrf: PW.getCSRFToken()
  }

  PW.confirmDialog('Clear cache', 'Are you sure to clear the cache?', async () => {
    const resp = await JH.http('/api/clearcache', data)
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Cache cleared')
  })
}

async function systemLock (lock) {
  const resp = await JH.http('/api/systemlock', { _csrf: PW.getCSRFToken(), lock })
  if (!await PW.checkResponse(resp)) {
    return
  }

  if (lock) {
    window.location = '/logout'
  }
  fillStatuses()
}

async function systemReadonly (readonly) {
  const resp = await JH.http('/api/systemreadonly', { _csrf: PW.getCSRFToken(), readonly })
  if (!await PW.checkResponse(resp)) {
    return
  }
  fillStatuses()
}

JH.event(domCache.clearCacheButton, 'click', async () => {
  await clearCache()
})

JH.event(domCache.systemLockSetButton, 'click', async (ev) => { await systemLock(true) })
JH.event(domCache.systemLockUnsetButton, 'click', async (ev) => { await systemLock(false) })

JH.event(domCache.readOnlySetButton, 'click', async (ev) => { await systemReadonly(true) })
JH.event(domCache.readOnlyUnsetButton, 'click', async (ev) => { await systemReadonly(false) })
