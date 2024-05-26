import * as PW from './passweaver-gui.js'
import * as GPicker from './grouppicker.js'

var userSearchTimeout
var currentUser = ""

async function fillUsers() {
  const search = jhValue("#usersearch")
  const resp = await jhFetch(`/api/userslist?search=${search}`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  const body = await resp.json()

  jhQuery("#groupstable tbody").innerHTML = ""
  jhQuery("#userstable tbody").innerHTML = ""

  if ( body.data.length ) {
    var row = ""
    for ( const itm of body.data ) {
      row +=
        `<tr data-id='${itm.id}' style='cursor:pointer'>`+
        `<td><sl-icon-button id='edituser-${itm.id}' title='Edit user' name='pencil' data-id='${itm.id}'></sl-icon-button></td>`+
        `<td><sl-icon-button id='removeuser-${itm.id}' title='Delete user' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button></td>`+
        `<td class='border-start'>${itm.login}</td>`+
        `<td>${itm.lastname}</td>`+
        `<td>${itm.firstname}</td>`+
        `<td>${itm.email}</td>`+
        `<td>${itm.locale}</td>`+
        `<td>${itm.authmethod}</td>`+
        `<td class='text-center'><sl-icon name='${itm.active ? "check-lg":"x-lg"}' style='color:${itm.active?"green":"red"}'/></td>`+
        `</tr>`
    }
    jhQuery("#userstable tbody").innerHTML = row

    // Install event handlers
    jhEvent("#userstable tbody tr", "dblclick",(ev)=>{
      userDoubleClicked(ev.currentTarget.getAttribute("data-id"))
    })
    jhEvent("#userstable tbody tr [id^=edituser]", "click",(ev)=>{
      userEditDialog(ev.currentTarget.getAttribute("data-id"))
    })
    jhEvent("#userstable tbody tr [id^=removeuser]", "click",(ev)=>{
      userRemove(ev.currentTarget.getAttribute("data-id"))
    })
    jhEvent("#userstable tbody tr", "click",(ev)=>{
      currentUser = ev.currentTarget.getAttribute("data-id")

      const sel = jhQuery("#userstable tbody tr.rowselected")
      if ( sel ) {
        sel.classList.remove("rowselected")
      }
      ev.currentTarget.classList.add("rowselected")
      fillGroups()
    })
  }
}

async function fillGroups() {
  jhQuery("#groupstable tbody").innerHTML = ""

  const resp = await jhFetch(`/api/usergroups/${currentUser}`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.data.length ) {
    var row = "<tr>"
    for ( const itm of body.data ) {
      row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' style='color:red;' title='Remove'></sl-icon-button></td>`
      row += `<td>${itm.description}</td></tr>`
    }
    jhQuery("#groupstable tbody").innerHTML = row

    // Event handlers
    jhEvent("[id^=removegroup]", "click", groupRemove)
  }
}

function userCreateDialog() {
  jhQuery("#newuserdialog").show()
  jhValue("#newuserdialog sl-input,sl-textarea,sl-select", "")
  userCreateEnable()
}

async function userCreate() {
  let userdata = {
    _csrf: PW.getCSRFToken(),
    login: jhValue("#newlogin"),
    email: jhValue("#newemail"),
    lastname: jhValue("#newlastname"),
    firstname: jhValue("#newfirstname"),
    locale: jhValue("#newlocale"),
    authmethod: jhValue("#newauthmethod"),
    active: jhQuery("#newactive").hasAttribute("checked"),
    secret: jhValue("#newpassword")
  }

  const resp = await jhFetch("/api/usernew/", userdata)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  fillUsers()
  jhQuery("#newuserdialog").hide()
  PW.showToast("success", "User created")
}

function userCreateEnable() {
  if (
    jhValue("#newlogin")=="" || jhValue("#newemail")=="" || jhValue("#newlastname")=="" ||
    jhValue("#newpassword")!=jhValue("#newpasswordconfirm") || jhValue("#newpassword")=="" ) {
      jhQuery("#usercreate").setAttribute("disabled","disabled")
  } else {
    jhQuery("#usercreate").removeAttribute("disabled")
  }
}

async function userRemove(usr) {
  PW.confirmDialog("Remove user", "<strong><span style='color:red;'>Are you sure you want to delete this user? Also his personal folder and contained items will be deleted!</span></strong>", async ()=> {
    const resp = await jhFetch(`/api/userremove/${usr}`, {_csrf: PW.getCSRFToken()})
    if ( !await PW.checkResponse(resp) ) {
      return
    }

    fillUsers()
    PW.showToast("success", "User removed")
  })
}

async function userEditFill(user) {
  const resp = await jhFetch(`/api/users/${user}`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  const body = await resp.json()

  jhValue("#editlogin", body.data.login)
  jhValue("#editemail", body.data.email)
  jhValue("#editlastname", body.data.lastname)
  jhValue("#editfirstname", body.data.firstname)
  jhValue("#editlocale", body.data.locale)
  jhValue("#editauthmethod", body.data.authmethod)
  if ( !body.data.active ) {
    jhQuery("#editactive").removeAttribute("checked")
  } else {
    jhQuery("#editactive").setAttribute("checked","checked")
  }

  userEditEnable()
}

function userEditEnable() {
  if ( jhValue("#editlogin")=="" || jhValue("#editemail")=="" || jhValue("#editlastname")=="" ) {
      jhQuery("#useredit").setAttribute("disabled","disabled")
  } else {
    jhQuery("#useredit").removeAttribute("disabled")
  }
}

function userEditDialog(userid) {
  userEditFill(userid)
  jhQuery("#edituserdialog").show()
}

async function userEdit() {
  let userdata = {
    _csrf: PW.getCSRFToken(),
    login: jhValue("#editlogin"),
    email: jhValue("#editemail"),
    lastname: jhValue("#editlastname"),
    firstname: jhValue("#editfirstname"),
    locale: jhValue("#editlocale"),
    authmethod: jhValue("#editauthmethod"),
    active: jhQuery("#editactive").hasAttribute("checked")
  }

  const resp = await jhFetch(`/api/userupdate/${currentUser}`, userdata)
  jhQuery("#edituserdialog").hide()
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  fillUsers()
  PW.showToast("success", "User saved")
}

function userDoubleClicked(user) {
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  jhQuery(`#edituser-${user}`).click()
}

async function groupRemove(ev) {
  const group = ev.currentTarget.getAttribute("data-id")
  PW.confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", async ()=> {
  const resp = await jhFetch(`/api/groupremoveuser/${group}/${currentUser}`, {_csrf: PW.getCSRFToken()})
    if ( !await PW.checkResponse(resp) ) {
      return
    }

    fillGroups()
    PW.showToast("success", "Group removed")
  })
}

async function groupPickerChoosen(group) {
  GPicker.hide()
  const resp = await jhFetch(`/api/groupadduser/${group}/${currentUser}`, {_csrf: PW.getCSRFToken()})
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  fillGroups()
  PW.showToast("success","Group added")
}

await fillUsers()

// Event handlers
jhEvent("#newlogin,#newemail,#newlastname,#newpassword,#newpasswordconfirm", "keyup", (ev)=>{
  userCreateEnable()
})
jhEvent("#usercreate", "click",(ev)=> {
  userCreate()
})
jhEvent("#editlogin,#editemail,#editlastname", "keyup",(ev)=>{
  userEditEnable()
})
jhEvent("#useredit", "click",(ev)=>{
  userEdit()
})
jhEvent("#newuser", "click",(ev)=>{
  userCreateDialog()
})
jhEvent("#newuserdialog #cancel", "click", (ev)=>{
  jhQuery("#newuserdialog").hide()
})
jhEvent("#usersearch", "sl-input", (ev) => {
  if ( userSearchTimeout ) {
    clearTimeout(userSearchTimeout)
  }
  userSearchTimeout = setTimeout(()=>{
    jhQuery("#groupstable tbody").innerHTML = ""
    fillUsers()
  },250)
})
jhEvent("#addgroup", "click",(ev)=>{
  if ( currentUser==="" ) {
    PW.errorDialog("Select a user")
    return
  }
  GPicker.show(groupPickerChoosen)
})