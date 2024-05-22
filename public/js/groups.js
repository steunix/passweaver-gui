var groupSearchTimeout

function currentGroup() {
  try {
    return jshQS("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

async function fillUsers() {
  jshQS("#userstable tbody").innerHTML = ""

  const resp = await fetch(`/api/userslist/${currentGroup()}`)

  if ( !await checkResponse2(resp) ) {
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
    jshQS("#userstable tbody").innerHTML = row

    // Install event handlers
    jshAddEventListener("#userstable tbody [id^=remove]", "click", (ev)=>{
      groupRemoveUser(ev.currentTarget.getAttribute("data-id"))
    })
  }

  // Group cannot be removed if not empty
  if ( jshQSA("#userstable tbody tr").length ) {
    jshQS("#groupremove").setAttribute("disabled","disabled")
  } else {
    jshQS("#groupremove").removeAttribute("disabled")
  }
}

function groupClicked(groupid) {
  fillUsers()
}

function groupCreateEnable() {
  if ( jshValue("#groupcreatedescription")==="" ) {
    jshQS("#groupcreatesave").setAttribute("disabled","disabled")
  } else {
    jshQS("#groupcreatesave").removeAttribute("disabled")
  }
}

function groupCreateDialog() {
  jshValue("#groupcreatedialog sl-input,sl-textarea", "")
  groupCreateEnable()
  jshQS("#groupcreatedialog").show()
}

async function groupCreate() {
  let userdata = {
    _csrf: getCSRFToken(),
    description: jshValue("#groupcreatedescription")
  }

  const resp = await jshFetch(`/api/groupnew/${currentGroup()}`, userdata)
  if ( !await checkResponse2(resp) ) {
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
    const resp = await jshFetch(`/api/groupremove/${currentGroup()}`, {_csrf: getCSRFToken()})

    if ( !await checkResponse2(resp) ) {
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
  const resp = await jshFetch(`/api/groups/${currentGroup()}`)
  if ( !await checkResponse2(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.status=="success" ) {
    jshValue("#groupeditdescription", body.data.description)
    groupEditEnable()
  }
}

async function groupEdit() {
  let data = {
    _csrf: getCSRFToken(),
    description: jshValue("#groupeditdescription")
  }

  const resp = await jshFetch(`/api/groupupdate/${currentGroup()}`, data)
  if ( !await checkResponse2(resp) ) {
    return
  }

    location.reload()
}

function groupEditEnable() {
  if ( jshValue("#groupeditdescription")=="" ) {
    jshQS("#groupeditsave").setAttribute("disabled","disabled")
  } else {
    jshQS("#groupeditsave").removeAttribute("disabled")
  }
}

async function userPickerChoosen(id) {
  const resp = await jshFetch(`/api/groupadduser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()})
  if ( !await checkResponse2(resp) ) {
    return
  }

  userPickerHide()
  fillUsers()
}

async function groupRemoveUser(id) {
  confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", async ()=> {
  const resp = await jshFetch(`/api/groupremoveuser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()})
    if ( !await checkResponse2(resp) ) {
      return
    }

    fillUsers()
  })
}

const resp = await fetch("/api/groupstree")
if ( await checkResponse2(resp) ) {
  const body = await resp.json()
  treeFill("groupstree",body.data,null,groupClicked)
}

// Event handlers
jshAddEventListener("#groupremove", "click", (ev)=>{
  groupRemove()
})
jshAddEventListener("#groupedit", "click", (ev)=>{
  groupEditDialog()
})
jshAddEventListener("#groupcreate", "click", (ev)=>{
  groupCreateDialog()
})

jshAddEventListener("#groupcreatedescription", "keyup", (ev)=>{
  groupCreateEnable()
})
jshAddEventListener("#groupcreatesave", "click", (ev)=>{
  groupCreate()
})
jshAddEventListener("#groupcreatecancel", "click", (ev)=> {
  jshQS("#groupcreatedialog").hide()
})

jshAddEventListener("#groupeditdescription", "keyup", (ev)=>{
  groupEditEnable()
})
jshAddEventListener("#groupeditsave", "click", (ev)=>{
  groupEdit()
})
jshAddEventListener("#groupeditcancel", "click", (ev)=> {
  jshQS("#groupeditdialog").hide()
})

jshAddEventListener("#newmember", "click", (ev)=>{
  if ( currentGroup()=="" ) {
    errorDialog("Select a group")
    return
  }
  userPickerShow(userPickerChoosen)
})

jshAddEventListener("#groupsearch", "sl-input", (ev)=> {
  if ( groupSearchTimeout ) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(()=>{
    const search = jshValue("#groupsearch")
    if ( !treeSearch("groupstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})
jshAddEventListener("#groupsearchnext", "click", (ev)=>{
  const search = jshValue("#groupsearch")
  treeSearchNext("groupstree", search)
})

jshAddEventListener("#groupsearchprevious", "click", (ev)=>{
  const search = jshValue("#groupsearch")
  treeSearchPrevious("groupstree", search)
})