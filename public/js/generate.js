import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

export class Generator {
  domCache = {
    generateDialog: JH.query('#generatedialog'),
    passwordLength: JH.query('#passwordlength'),
    passwordInput: JH.query('#generatedpassword'),
    noSymPasswordInput: JH.query('#generatedpasswordns'),
    generateButton: JH.query('#generate'),
    noSymGenerateButton: JH.query('#generatens'),
    onetimeCreate: JH.query('#onetime'),
    noSymOnetimeCreate: JH.query('#onetimens'),
    generatedPasswordInput: JH.query('#generatedpassword'),
    noSymGeneratedPasswordInput: JH.query('#generatedpasswordns')
  }

  constructor () {
    this.installEvents()
  }

  async generatePassword (symbols = true) {
    const passwordInput = symbols ? this.domCache.passwordInput : this.domCache.noSymPasswordInput
    JH.value(passwordInput, 'Generating...')
    let url = symbols ? '/api/generatepassword?' : '/api/generatepassword?symbols=false'
    url += `&length=${JH.value(this.domCache.passwordLength)}`

    const resp = await JH.http(url)
    if (!await PW.checkResponse(resp)) {
      return
    }

    const body = await resp.json()
    if (body.status === 'success') {
      JH.value(passwordInput, body.data.password)
    }
  }

  tokenGenerate (data) {
    window.location = `/pages/onetimesecret?data=${encodeURIComponent(data)}`
  }

  show () {
    this.domCache.generateDialog.show()
    this.generatePassword()
    this.generatePassword(false)
  }

  installEvents () {
    JH.event(this.domCache.generateButton, 'click', async () => {
      await this.generatePassword()
    })

    JH.event(this.domCache.noSymGenerateButton, 'click', async () => {
      await this.generatePassword(false)
    })

    JH.event(this.domCache.onetimeCreate, 'click', () => {
      this.tokenGenerate(JH.value(this.domCache.generatedPasswordInput))
    })

    JH.event(this.domCache.noSymOnetimeCreate, 'click', () => {
      this.tokenGenerate(JH.value(this.domCache.noSymGeneratedPasswordInput))
    })

    JH.event(this.domCache.passwordLength, 'change', async () => {
      this.domCache.passwordInput.style.width = `${JH.value(this.domCache.passwordLength) + 8}em`
      this.domCache.noSymPasswordInput.style.width = `${JH.value(this.domCache.passwordLength) + 8}em`
      await this.generatePassword()
      await this.generatePassword(false)
    })

    JH.event('#menu-generator', 'click', (ev) => {
      ev.preventDefault()
      PWDGenerator.show()
      return false
    })
  }
}

const PWDGenerator = new Generator()
