import * as PW from './passweaver-gui.js'

jhEvent("#show", "click", async(ev)=>{
  const token = jhQuery("#data").getAttribute("data-token")
  try {
    const resp = await jhFetch(`/noauth/onetimesecretget/${token}`)
    const body = await resp.json()
    if ( typeof(body.data)!=="string" || body.data.length<1 ) {
      throw new Error("Not found")
    }
    jhValue("#data", body.data)
  } catch (err) {
    PW.errorDialog("This secret does not exist, or it may have already been read. Please check the link.")
    jhQuery("#show").style.visibility = "hidden"
    jhQuery("#result").style.visibility = "hidden"
    return
    }
  jhQuery("#show").style.visibility = "hidden"
  jhQuery("#result").style.visibility = "visible"
})