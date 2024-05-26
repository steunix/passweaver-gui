import * as UPicker from './userpicker.js'

var groupSearchTimeout

function currentGroup() {
  try {
    return jhQuery("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

async function fillUsers() {
  jhQuery("#userstable tbody").innerHTML = ""

  const resp = await fetch(`/api/userslist/${currentGroup()}`)

  if ( !await checkResponse(resp) ) {
    return
  }
  const body = await resp.json()

  if ( body.data.length ) {
    var row = ''
    for ( const usr of body.data ) {
      row +=
        `<tr>`+
        `<td><sl-icon-button id='remove-${usr.id}' title='Remove' data-id='${usr.id}' name="trash3" style="color:red;"></sl-icon-button></td>`+
        `<td class='border-start'>${usr.login}</td>`+
        `<td>${usr.lastname}</td>`+
        `<td>${usr.firstname}</td>`
    }
    jhQuery("#userstable tbody").innerHTML = row

    // Install event handlers
    jhEvent("#userstable tbody [id^=remove]", "click", (ev)=>{
      groupRemoveUser(ev.currentTarget.getAttribute("data-id"))
    })
  }

  // Group cannot be removed if not empty
  if ( jhQueryAll("#userstable tbody tr").length ) {
    jhQuery("#groupremove").setAttribute("disabled","disabled")
  } else {
    jhQuery("#groupremove").removeAttribute("disabled")
  }
}

function groupClicked(groupid) {
  fillUsers()
}

function groupCreateEnable() {
  if ( jhValue("#groupcreatedescription")==="" ) {
    jhQuery("#groupcreatesave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#groupcreatesave").removeAttribute("disabled")
  }
}

function groupCreateDialog() {
  jhValue("#groupcreatedialog sl-input,sl-textarea", "")
  groupCreateEnable()
  jhQuery("#groupcreatedialog").show()
}

async function groupCreate() {
  let userdata = {
    _csrf: getCSRFToken(),
    description: jhValue("#groupcreatedescription")
  }

  const resp = await jhFetch(`/api/groupnew/${currentGroup()}`, userdata)
  if ( !await checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.data.id ) {
    location.reload()
  } else {
    errorDialog(body.message)
  }
}

async function groupRemove() {
  confirmDialog("Remove group", "Are you sure you want to remove this group?", async ()=> {
    const resp = await jhFetch(`/api/groupremove/${currentGroup()}`, {_csrf: getCSRFToken()})

    if ( !await checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupEditDialog() {
  groupEditFill()
  document.querySelector("#groupeditdialog").show()
}

async function groupEditFill() {
  const resp = await jhFetch(`/api/groups/${currentGroup()}`)
  if ( !await checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.status=="success" ) {
    jhValue("#groupeditdescription", body.data.description)
    groupEditEnable()
  }
}

async function groupEdit() {
  let data = {
    _csrf: getCSRFToken(),
    description: jhValue("#groupeditdescription")
  }

  const resp = await jhFetch(`/api/groupupdate/${currentGroup()}`, data)
  if ( !await checkResponse(resp) ) {
    return
  }

    location.reload()
}

function groupEditEnable() {
  if ( jhValue("#groupeditdescription")=="" ) {
    jhQuery("#groupeditsave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#groupeditsave").removeAttribute("disabled")
  }
}

async function userPickerChoosen(id) {
  const resp = await jhFetch(`/api/groupadduser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()})
  if ( !await checkResponse(resp) ) {
    return
  }

  UPicker.hide()
  fillUsers()
  showToast("success", "User added to the group")
}

async function groupRemoveUser(id) {
  confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", async ()=> {
    const resp = await jhFetch(`/api/groupremoveuser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()})
    if ( !await checkResponse(resp) ) {
      return
    }

    fillUsers()
    showToast("success", "User removed from group")
  })
}

const resp = await fetch("/api/groupstree")
if ( await checkResponse(resp) ) {
  const body = await resp.json()
  treeFill("groupstree",body.data,null,groupClicked)
}

// Event handlers
jhEvent("#groupremove", "click", (ev)=>{
  groupRemove()
})
jhEvent("#groupedit", "click", (ev)=>{
  groupEditDialog()
})
jhEvent("#groupcreate", "click", (ev)=>{
  groupCreateDialog()
})

jhEvent("#groupcreatedescription", "keyup", (ev)=>{
  groupCreateEnable()
})
jhEvent("#groupcreatesave", "click", (ev)=>{
  groupCreate()
})
jhEvent("#groupcreatecancel", "click", (ev)=> {
  jhQuery("#groupcreatedialog").hide()
})

jhEvent("#groupeditdescription", "keyup", (ev)=>{
  groupEditEnable()
})
jhEvent("#groupeditsave", "click", (ev)=>{
  groupEdit()
})
jhEvent("#groupeditcancel", "click", (ev)=> {
  jhQuery("#groupeditdialog").hide()
})

jhEvent("#newmember", "click", (ev)=>{
  if ( currentGroup()=="" ) {
    errorDialog("Select a group")
    return
  }
  UPicker.show(userPickerChoosen)
})

jhEvent("#groupsearch", "sl-input", (ev)=> {
  if ( groupSearchTimeout ) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(()=>{
    const search = jhValue("#groupsearch")
    if ( !treeSearch("groupstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})
jhEvent("#groupsearchnext", "click", (ev)=>{
  const search = jhValue("#groupsearch")
  treeSearchNext("groupstree", search)
})

jhEvent("#groupsearchprevious", "click", (ev)=>{
  const search = jhValue("#groupsearch")
  treeSearchPrevious("groupstree", search)
})