import * as PW from './passweaver-gui.js'

const resp = await jhFetch(`/api/preferences`)
await PW.checkResponse(resp)

const body = await resp.json()
for ( const setting of body.data ) {
  if ( setting.setting=="theme" ) {
   jhValue("#theme", setting.value)
  }
}

jhEvent("#save", "click", async(ev)=>{
  const data = {
    _csrf: PW.getCSRFToken(),
    theme: jhValue("#theme")
  }
  const resp = await jhFetch(`/api/preferences`, data)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  PW.showToast("success", "Preferences saved")
  location.reload()
})