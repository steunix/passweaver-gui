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

jhEvent("#newpassword1,#newpassword2", "keyup", async(ev)=>{
  if ( jhValue("#newpassword1")!=jhValue("#newpassword2") || jhValue("#newpassword1").length < 8 ) {
    jhAttribute("#passwordchange","disabled","disabled")
  } else {
    jhQuery("#passwordchange").removeAttribute("disabled")
  }
})

jhEvent("#passwordchange", "click", async(ev)=>{
  const data = {
    _csrf: PW.getCSRFToken(),
    password: jhValue("#newpassword1")
  }
  const resp = await jhFetch(`/api/changepassword`, data)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  PW.showToast("success", "Password successfully changed")
  location.reload()
})

jhEvent("#pnewpassword1,#pnewpassword2", "keyup", async(ev)=>{
  if ( jhValue("#pnewpassword1")!=jhValue("#pnewpassword2") || jhValue("#pnewpassword1").length < 8 ) {
    jhAttribute("#ppasswordchange","disabled","disabled")
  } else {
    jhQuery("#ppasswordchange").removeAttribute("disabled")
  }
})

jhEvent("#ppasswordchange", "click", async(ev)=>{
  const data = {
    _csrf: PW.getCSRFToken(),
    password: jhValue("#pnewpassword1")
  }
  const resp = await jhFetch(`/api/personalpasswordchange`, data)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  PW.showToast("success", "Password successfully changed")
  location.reload()
})