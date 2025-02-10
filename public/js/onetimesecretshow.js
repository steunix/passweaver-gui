import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  token: JH.query('#token'),
  result0: JH.query('#result0'),
  result1: JH.query('#result1'),
  secret: JH.query('#secret'),
  showButton: JH.query('#show'),
  itemTitle: JH.query('#itemtitle'),
  itemDescription: JH.query('#itemdescription'),
  itemEmail: JH.query('#itememail'),
  itemUrl: JH.query('#itemurl'),
  itemUser: JH.query('#itemuser'),
  itemPassword: JH.query('#itempassword')

}

JH.event('#show', 'click', async (ev) => {
  const token = domCache.token.getAttribute('data-token')
  try {
    const resp = await JH.http(`/noauth/onetimesecretget/${token}`)
    if (!await PW.checkResponse(resp)) {
      throw new Error()
    }

    const body = await resp.json()
    if (body.data?.type === undefined) {
      PW.errorDialog('This token does not exist, or it has been already read')
      throw new Error()
    }
    // Secret
    if (body.data.type === 0) {
      JH.value(domCache.secret, body.data.secret)
      domCache.result0.style.visibility = 'visible'
      domCache.result0.style.display = 'block'
    }
    // Item
    if (body.data.type === 1) {
      JH.value(domCache.itemTitle, body.data.item.title)
      const data = JSON.parse(body.data.item.data)
      JH.value(domCache.itemDescription, data.description)
      JH.value(domCache.itemEmail, data.email)
      JH.value(domCache.itemUrl, data.url)
      JH.value(domCache.itemUser, data.user)
      JH.value(domCache.itemPassword, data.password)

      domCache.result1.style.visibility = 'visible'
      domCache.result1.style.display = 'block'
    }
    domCache.showButton.style.visibility = 'hidden'
    domCache.showButton.style.display = 'none'
  } catch (err) {
    domCache.showButton.style.visibility = 'hidden'
    domCache.result0.style.display = 'none'
    domCache.result1.style.display = 'none'
  }
})
