var treeCallback
const itemFound = new Event("pw-item-found")

export function confirmDialog(title,text,callback,savetext,savevariant) {
  const dialog = jhQuery("#confirmdialog")
  dialog.setAttribute("label", title)

  jhQuery("#confirmok").replaceWith(jhQuery("#confirmok").cloneNode(true))

  jhQuery("#confirmok").innerHTML = "Confirm"
  jhQuery("#confirmok").setAttribute("variant", "primary")

  jhQuery("#confirmdialogtext").innerHTML = text

  if ( savetext !== undefined ) {
    jhQuery("#confirmok").innerHTML = savetext
  }
  if ( savevariant !== undefined ) {
    jhQuery("#confirmok").setAttribute("variant", savevariant)
  }
  jhEvent("#confirmok", "click", event=> {
    dialog.hide()
    callback()
    return
  })

  jhQuery("#confirmcancel").replaceWith(jhQuery("#confirmcancel").cloneNode(true))
  jhEvent("#confirmcancel", "click", event=> {
    dialog.hide()
  })
  dialog.addEventListener('sl-request-close', event => {
    if (event.detail.source === 'overlay') {
      event.preventDefault();
    }
  })
  dialog.show()
}

export function errorDialog(text) {
  const dialog = jhQuery("#errordialog")
  jhQuery("#errordialogtext").innerHTML = text

  jhQuery("#errordialogclose").replaceWith(jhQuery("#errordialogclose").cloneNode(true))
  jhEvent("#errordialogclose", "click", event=> {
    dialog.hide()
  })
  dialog.show()
}

export async function checkResponse(resp,ignoreStatus) {
  const respClone = resp.clone()
  let body
  try {
    body = await respClone.json()
  } catch (err) {
    errorDialog("Bad request to PassWeaver GUI")
    return
  }

  const ignore = typeof ignoreStatus=="object" ? ignoreStatus : [ignoreStatus]
  if ( body.status=="success" ) {
    return true
  }
  if ( body.status=="failed" && body.httpStatusCode==404 ) {
    return true
  }
  if ( body.status=="failed" && ignoreStatus && ignore.includes(body.httpStatusCode) ) {
    return true
  }

  if ( body.status=="failed" && body.fatal ) {
    window.location = "/logout?error="+encodeURIComponent(body.message)
    return
  }

  errorDialog(body.message)
}

function treeSelectionChange(ev) {
  const sel = jhQuery("sl-tree-item[selected]")
  const id = sel.getAttribute("data-id")
  treeCallback(id)

  // Save last item
  const user = getUser()
  const lskey = `${user}_${ev.target.id}_selected`
  localStorage.setItem(lskey, sel.id)
}

export function treeFill(id, data, mainid, callback) {
  const user = getUser()

  const parent = jhQuery(`#${id}`)
  const root = mainid ? mainid : id

  for ( const item of data ) {
    const newid = `item-${item.id}`

    const lskey = `${user}_${root}_expanded_${newid}`
    var props = "";
    if ( localStorage.getItem(lskey)==="1" ) {
      props += " expanded"
    }

    const html = `<sl-tree-item id='${newid}' data-id='${item.id}' ${props} data-description='${item.description}'>${item.description}</sl-tree-item>`
    const cont = new DOMParser().parseFromString(html, 'text/html')
    const newitem = cont.querySelector("body").firstChild

    parent.append(newitem)
    jhEvent(`#${newid}`, "sl-collapse", (ev)=> {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.removeItem(lskey)
    })
    jhEvent(`#${newid}`, "sl-expand", (ev)=> {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.setItem(lskey, "1")
    })

    // Recurse with children
    if ( item?.children.length ) {
      treeFill(newid, item.children, root, callback)
    }
  }

  // Only once, for root element
  if ( !mainid ) {
    treeCallback = callback
    jhEvent(`#${id}`, "sl-selection-change", treeSelectionChange)

    var last = localStorage.getItem(`${user}_${id}_selected`)
    if ( last ) {
      // Select last item
      const lastelem = jhQuery(`#${last}`)
      if ( lastelem ) {
        jhQuery(`#${last}`).setAttribute("selected","selected")
        setTimeout(()=>{
          lastelem.scrollIntoView()
          callback(last)
        }, 200)
      }
    }
  }
}

export function treeItemSelect(elemid) {
  const treeitem = jhQuery(`#${elemid}`)

  // Expand parents
  var parents = jhParents(treeitem, "sl-tree-item")
  for ( const parent of parents ) {
    parent.setAttribute("expanded","expanded")
  }

  const selected = jhQueryAll("sl-tree-item[selected]")
  for ( const s of selected ) {
    s.removeAttribute("selected")
  }
  treeitem.setAttribute("selected","selected")
  setTimeout(()=>{
    treeitem.scrollIntoView()
  }, 200)
}

var searchTreeIndex = 0
export function treeSearch(elemid,searchstring,start) {
  if ( start===undefined ) {
    searchTreeIndex = 0
  }

  var treeitems = jhQueryAll(`#${elemid} sl-tree-item`)
  const searchtoken = searchstring.toLowerCase()

  var index = 0
  for ( const treeitem of treeitems ) {
    if ( treeitem.getAttribute("data-description").toLowerCase().includes(searchtoken) ) {
      if ( index==searchTreeIndex ) {

        // Select item and show it
        treeItemSelect(treeitem.id)
        dispatchEvent(itemFound)

        // Store last viewed item
        const user = getUser()
        const lskey = `${user}_${elemid}_selected`
        localStorage.setItem(lskey, treeitem.id)

        return true
      }
      index++
    }
  }
  return false
}

export function treeSearchNext(elemid,searchstring) {
  searchTreeIndex++
  const ret = treeSearch(elemid,searchstring,searchTreeIndex)
  if ( !ret ) {
    searchTreeIndex--
  }
  return ret
}

export function treeSearchPrevious(elemid,searchstring) {
  searchTreeIndex--
  const ret = treeSearch(elemid,searchstring,searchTreeIndex)
  if ( !ret ) {
    searchTreeIndex++
  }
  return ret
}

export function showToast(variant,text) {
  const icon = {
    "success": "check2-circle",
    "primary": "info-circle",
    "danger": "exclamation-octagon",
    "warning": "exclamation-triangle"
  }

  const alert = Object.assign(document.createElement('sl-alert'), {
    variant,
    closable: true,
    duration: 3000,
    innerHTML: `<sl-icon name="${icon[variant]}" slot="icon"></sl-icon>${text}`
  })

  document.body.append(alert)
  alert.toast()
}

export function getUser() {
  return jhValue("#v-user")
}

export function getCSRFToken() {
  return jhValue("#_csrf")
}

if ( jhQuery("#pageid") ) {
  const pageid = jhValue("#pageid")
  const elem = jhQuery(`.page-sidebar .link[pageid=${pageid}]`)
  if ( elem ) {
    elem.classList.add("current")
  }
}

if ( jhQuery("#globalsearch") ) {
  jhEvent("#globalsearch", "keypress", (ev)=>{
    if ( ev.keyCode==13 && jhValue("#globalsearch").length>3 ) {
      window.location = "/pages/search?search=" + encodeURIComponent(jhValue("#globalsearch"))
    }
  })
}

jhEvent(document, "keydown", (ev)=>{
  if ( ev.ctrlKey && ev.keyCode==220 ) {
    jhQuery("#globalsearch").focus()
  }
})