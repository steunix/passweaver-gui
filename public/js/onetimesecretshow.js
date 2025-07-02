import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as Crypt from './crypt.js'

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
    const key = Crypt.createKey()
    const resp = await JH.http(`/noauth/onetimesecretget/${token}?key=${key}`)
    if (!await PW.checkResponse(resp)) {
      throw new Error()
    }

    const body = await resp.json()
    if (body.httpStatusCode === 404) {
      PW.errorDialog('This token does not exist, or it has been already read')
      throw new Error()
    }

    // Decrypt data using token
    const decrypted = JSON.parse(await Crypt.decryptBlock(body.data, key))

    // Secret
    if (decrypted.type === 0) {
      JH.value(domCache.secret, decrypted.secret)
      domCache.result0.style.visibility = 'visible'
      domCache.result0.style.display = 'block'
    }
    // Item
    if (decrypted.type === 1) {
      JH.value(domCache.itemTitle, decrypted.item.title)
      const data = JSON.parse(decrypted.item.data)
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
