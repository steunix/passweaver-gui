function spinnerShow() {
  $("body").append(`
  <div id="spinner" class="v-overlay">
    <div class="v-spinner">
      <div class="spinner-border text-success"></div>
    </div>
  </div>`
  );
}

function spinnerHide() {
  $("#spinner").remove()
}

function loadingShow(el) {
  el.addClass("v-blur")
}

function loadingHide(el) {
  el.removeClass("v-blur")
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

function checkResponse(resp,ignoreStatus) {
  if ( resp.status=="success" ) {
    return true
  }
  if ( resp.status=="failed" && resp.httpStatusCode=="404" ) {
    return true
  }
  if ( resp.status=="failed" && ignoreStatus && resp.httpStatusCode==ignoreStatus ) {
    return true
  }

  if ( resp.status=="failed" && resp.fatal ) {
    window.location = "/logout?error="+encodeURIComponent(resp.message)
    return
  }

  errorDialog(resp.message)
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
        treeitem.scrollIntoView()

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
  if ( !treeSearch(elemid,searchstring,searchTreeIndex) ) {
    searchTreeIndex--
  }
}

function treeSearchPrevious(elemid,searchstring) {
  searchTreeIndex--
  if ( !treeSearch(elemid,searchstring,searchTreeIndex) ) {
    searchTreeIndex++
  }
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
  return $("#v-user").val()
}

$(document).ajaxError(function(evt, request, settings){
  if (request.getResponseHeader("Location") ) {
     location.href = request.getResponseHeader("Location")
  }
})

$(()=>{
  if ( $("#pageid").length ) {
    const pageid = $("#pageid").val()
    $(`.page-sidebar .link[pageid=${pageid}]`).addClass("current")
  }
})
