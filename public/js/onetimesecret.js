import * as PW from './passweaver-gui.js'

jhEvent("#data", "keyup", async(ev)=>{
  if ( jhValue("#data")=="" ) {
    jhQuery("#save").setAttribute("disabled","disabled")
  } else {
    jhQuery("#save").removeAttribute("disabled")
  }
})

jhEvent("#save", "click", async(ev)=>{
  const data = {
    _csrf: PW.getCSRFToken(),
    data: jhValue("#data")
  }
  const resp = await jhFetch(`/api/onetimesecret`, data)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  jhValue("#link", `${window.location.origin}/onetimesecret/${body.data.token}`)

  jhQuery("#result").style.visibility = "visible"
  PW.showToast("success", "Link created")
})