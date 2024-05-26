function spinnerShow() {
  const spinner = document.createElement('template')
  spinner.innerHTML = `
    <div id="spinner" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; display: flex; align-items: center; justify-content: center;"">
      <sl-spinner style="font-size: 5rem; --track-width: 15px;"></sl-spinner>
    </div>`
  document.querySelector("body").append(spinner.content)
}

function spinnerHide() {
  document.querySelector("#spinner").remove()
}

function generatePassword() {
  var resp = $.ajax({
    type: "GET",
    url: "/api/generatepassword",
    async: false
  })

  return resp.responseJSON.data.password
}

function confirmDialog(title,text,callback) {
  const dialog = $("#confirmdialog")
  dialog.attr("label", title)
  $("#confirmdialogtext").html(text)
  $("#confirmok").off("click").on("click", event=> {
    dialog[0].hide()
    callback()
    return
  })
  $("#confirmcancel").on("click", event=> {
    dialog[0].hide()
  })
  dialog.on('sl-request-close', event => {
    if (event.detail.source === 'overlay') {
      event.preventDefault();
    }
  })
  dialog[0].show()
}

function errorDialog(text) {
  const dialog = $("#errordialog")
  $("#errordialogtext").html(text)
  $("#errordialogclose").on("click", event=> {
    dialog[0].hide()
  })
  dialog[0].show()
}

async function checkResponse(resp,ignoreStatus) {
  const respClone = resp.clone()
  const body = await respClone.json()

  const ignore = typeof ignoreStatus=="object" ? ignoreStatus : [ignoreStatus]
  if ( body.status=="success" ) {
    return true
  }
  if ( body.status=="failed" && body.httpStatusCode=="404" ) {
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

function treeFill(id, data, mainid, callback) {
  const user = getUser()

  const parent = $(`#${id}`)
  const root = mainid ? mainid : id

  for ( item of data ) {
    const newid = `item-${item.id}`

    const lskey = `${user}_${root}_expanded_${newid}`
    var props = "";
    if ( localStorage.getItem(lskey)==="1" ) {
      props += " expanded"
    }

    let newitem = $(`<sl-tree-item id='${newid}' data-id='${item.id}' ${props} data-description='${item.description}'>${item.description}</sl-tree-item>`)

    parent.append(newitem)
    newitem.on("sl-collapse", (ev)=> {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.removeItem(lskey)
    })
    newitem.on("sl-expand", (ev)=> {
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
    $(`#${id}`).off("sl-selection-change").on("sl-selection-change", (ev)=>{
      const sel = document.querySelector("sl-tree-item[selected]")
      callback(sel.getAttribute("data-id"))

      // Save last item
      const user = getUser()
      const lskey = `${user}_${id}_selected`
      localStorage.setItem(lskey, sel.id)
    })

    var last = localStorage.getItem(`${user}_${id}_selected`)
    if ( last ) {
      // Select last item
      const lastelem = document.querySelector(`#${last}`)
      if ( lastelem ) {
        $(`#${last}`).attr("selected","selected")
        setTimeout(()=>{
          lastelem.scrollIntoView()
          callback(last)
        }, 200)
      }
    }
  }
}

var searchTreeIndex = 0
function treeSearch(elemid,searchstring,start) {
  if ( start===undefined ) {
    searchTreeIndex = 0
  }

  var treeitems = document.querySelector(`#${elemid}`).querySelectorAll("sl-tree-item")

  var index = 0
  for ( const treeitem of treeitems ) {
    if ( treeitem.getAttribute("data-description").toLowerCase().includes(searchstring) ) {
      if ( index==searchTreeIndex ) {

        // Expand parents
        var parents = $(treeitem).parents()
        for ( const parent of parents ) {
          $(parent).prop("expanded","expanded")
        }

        // Select item and show it
        $("sl-tree-item").prop("selected","")
        $(treeitem).prop("selected","selected")
        setTimeout(()=>{treeitem.scrollIntoView()}, 200)
        $(treeitem).trigger("sl-selection-change")

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

function treeSearchNext(elemid,searchstring) {
  searchTreeIndex++
  const ret = treeSearch(elemid,searchstring,searchTreeIndex)
  if ( !ret ) {
    searchTreeIndex--
  }
  return ret
}

function treeSearchPrevious(elemid,searchstring) {
  searchTreeIndex--
  const ret = treeSearch(elemid,searchstring,searchTreeIndex)
  if ( !ret ) {
    searchTreeIndex++
  }
  return ret
}

function showToast(variant,text) {
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
  });

  document.body.append(alert)
  alert.toast()
}

function getUser() {
  return document.querySelector("#v-user").value
}

function getCSRFToken() {
  return document.querySelector("#_csrf").value
}

$(document).ajaxError(function(evt, request, settings){
  if (request.getResponseHeader("Location") ) {
     location.href = request.getResponseHeader("Location")
  }
})

if ( $("#pageid").length ) {
  const pageid = $("#pageid").val()
  $(`.page-sidebar .link[pageid=${pageid}]`).addClass("current")
}
