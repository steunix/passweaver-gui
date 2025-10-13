/**
 * PassWeaver-GUI, a GUI for PassWeaver-API password manager
 *
 * (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import https from 'https'
import FS from 'fs'
import Morgan from 'morgan'
import * as RFS from 'rotating-file-stream'
import favicon from 'serve-favicon'
import { RedisStore } from 'connect-redis'
import * as RedisClient from 'redis'

import * as Config from './src/config.mjs'
import * as PassWeaver from './src/passweaver.mjs'
import * as Crypt from './src/crypt.mjs'
import session from 'express-session'
import jsonwebtoken from 'jsonwebtoken'
import rateLimitMiddleware from './src/ratelimiter.mjs'
import lusca from 'lusca'
import * as Semver from 'semver'
import * as GOAuth2 from 'google-auth-library'

export const app = Express()

const cfg = Config.get()

// Check for minimum PassWeaver API version
try {
  const minpwapiversion = '2.4.0'
  const resp = await PassWeaver.version()
  const pwapiversion = resp.data.version
  if (!Semver.gte(pwapiversion, minpwapiversion)) {
    console.error(`PassWaver GUI requires PassWeaver API version ${minpwapiversion} at least, found ${pwapiversion}`)
    process.exit(1)
  }
} catch (err) {
  console.error('Cannot connect to PassWaver API. Verify your settings and check that PassWeaver API is up and running.')
  process.exit(1)
}

// Express middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'", 'early.webawesome.com', 'ka-f.fontawesome.com', 'cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'fonts.bunny.net', 'early.webawesome.com', 'ka-f.fontawesome.com', 'cdn.jsdelivr.net'],
      'connect-src': ["'self'", 'data: blob:', 'ka-f.fontawesome.com', 'cdn.jsdelivr.net'],
      'img-src': ["'self'", 'https: data: blob:', 'ka-f.fontawesome.com']
    }
  }
}))

if (cfg?.https?.hsts) {
  app.use(helmet.hsts())
}

app.use(Express.json())

app.use(compression({ threshold: 10240 }))

app.use(Express.urlencoded({ extended: true }))

// Session middleware
if (cfg.redis.enabled) {
  // Redis
  const redisClient = RedisClient.createClient({ url: cfg.redis.url })
  redisClient.connect()

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'pwgui:'
  })

  app.use(session({
    store: redisStore,
    name: 'passweavergui',
    secret: cfg.session_key,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: cfg.https.enabled, maxAge: 1000 * 60 * 60 * 4 }
  }))
} else {
  // Node-cache
  app.use(session({
    name: 'passweavergui',
    secret: cfg.session_key,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: cfg.https.enabled, maxAge: 1000 * 60 * 60 * 4 }
  }))
}

// CSRF protection
app.use(lusca.csrf({
  key: '_csrf',
  secret: cfg.csrf_key
}))

// Favicon
app.use(
  favicon('./public/images/favicon.ico')
)

// Checks for valid session in pages/ subdir. We can use redirect since they are not Ajax
app.use('/pages', function (req, res, next) {
  if (req?.session?.user === undefined) {
    let link = '/login?error=' + encodeURIComponent('You need to login')
    if (req.query?.viewitem) {
      link += '&viewitem=' + encodeURIComponent(req.query.viewitem)
    }
    res.redirect(link)
    return
  }
  return next()
})

// Checks for valid session in api/ subdir. We cant handle redirect()
app.use('/api', function (req, res, next) {
  if (req?.session?.user === undefined) {
    res.json({
      status: 'failed',
      httpStatusCode: '401',
      fatal: true,
      message: 'You need to login',
      data: {}
    })
    return
  }
  return next()
})

// Use EJS
app.set('view engine', 'ejs')

// Rate limiter
app.use('/access', rateLimitMiddleware)
app.use('/login/google/url', rateLimitMiddleware)
app.use('/login/google/callback', rateLimitMiddleware)
app.use('/noauth/onetimesecretget', rateLimitMiddleware)
app.use('/noauth/onetimesecret', rateLimitMiddleware)

if (!FS.existsSync(cfg.log.dir)) {
  FS.mkdirSync(cfg.log.dir)
}

// Log requests
const logAccess = RFS.createStream(`${cfg.log.dir}/passweaver-gui-access.log`, {
  interval: cfg.log.rotation,
  rotate: cfg.log.retention
})
app.use(
  Morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :total-time[0]',
    { stream: logAccess }
  )
)

// Static resources
app.use(`/public/v${Config.packageJson().version}`, Express.static('./public', {
  maxAge: (process.env?.NODE_ENV === 'production' ? '1y' : 0),
  immutable: true
}))

// WebAwesome has its own version
app.use(`/public/webawesome/v${Config.webawesomePackageJson().version}/`, Express.static('./node_modules/@awesome.me/webawesome', { maxAge: '1y', immutable: true }))

// Log errors
const logErrors = RFS.createStream(`${cfg.log.dir}/passweaver-gui-errors.log`, {
  interval: cfg.log.rotation,
  rotate: cfg.log.retention
})

// Common parameters to pass to pages
function commonParams (req) {
  return {
    csrftoken: req.csrfToken(),
    company_name: cfg.company_name,
    user: req.session.user,
    userdescription: req.session.userdescription,
    admin: req.session.admin,
    viewitem: req.query?.viewitem ?? '',
    theme: req?.session?.theme ?? 'light',
    font: req?.session?.font ?? 'normal',
    version: Config.packageJson().version,
    manage_folders: req.session.admin || Config.get().folders.user_managed,
    waversion: Config.webawesomePackageJson().version
  }
}

// Google OAuth2 setup
let GOAuth2Client = null
if (cfg?.auth?.google_oauth2?.enabled === true) {
  GOAuth2Client = new GOAuth2.OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  )
}

/**
 * Pages
 */

// Login page
app.get(['/login', '/'], (req, res) => {
  if (req?.session?.user === undefined) {
    req.locals = {
      error: req.query.error,
      google_oauth2_enabled: (cfg?.auth?.google_oauth2?.enabled === true)
    }
    res.render('login', { ...req.locals, ...commonParams(req) })
  } else {
    res.redirect('/pages/items')
  }
})

// Setup Google OAuth2 routes if enabled
if (GOAuth2Client !== null) {
  // Get Google OAuth2 URL
  app.get('/login/google/url', async (req, res) => {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const authUrl = GOAuth2Client.generateAuthUrl({
      access_type: 'offline', // Richiede il refresh token
      scope: scopes.join(' '),
      state: 'abcd'
    })

    res.json({ url: authUrl })
  })

  // Google OAuth2 callback
  app.get('/login/google/callback', async (req, res) => {
    const { code } = req.query

    if (!code) {
      res.redirect('/login?error=' + encodeURIComponent('Google authentication failed'))
      return
    }

    const { tokens } = await GOAuth2Client.getToken(code)
    GOAuth2Client.setCredentials(tokens)

    // Verifica e estrazione dei dati utente dal token ID
    await GOAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    // Send user info to PassWeaver API for login
    const resp = await PassWeaver.login(null, null, tokens.id_token)
    if (resp.status !== 'success') {
      res.redirect('/login?error=' + encodeURIComponent(resp.message))
      return
    }

    await processLogin(req, res, resp)
  })
}

// Access page
app.post('/access', async (req, res) => {
  const resp = await PassWeaver.login(req.body.username, req.body.password)

  if (resp.status !== 'success') {
    let link = '/login?error=' + encodeURIComponent(resp.message)
    if (req.body?.viewitem) {
      link += '&viewitem=' + encodeURIComponent(req.body.viewitem)
    }
    res.redirect(link)
    return
  }

  await processLogin(req, res, resp)
})

// Process login
async function processLogin (req, res, resp) {
  // Get user name
  req.session.jwt = resp.data.jwt
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.session.user = jwt.sub
  req.session.admin = jwt.admin

  const usr = await PassWeaver.getUser(req.session, req.session.user)

  req.session.userdescription = (`${usr.data.firstname} ${usr.data.lastname}`).trim()
  req.session.email = usr.data.email

  // Get user preferences
  const prefs = await PassWeaver.preferencesGet(req.session)
  const theme = prefs.data.find((el) => { return el.setting === 'theme' })
  req.session.theme = theme?.value || 'light'
  const font = prefs.data.find((el) => { return el.setting === 'font' })
  req.session.font = font?.value || 'normal'
  req.session.save()

  if (req.session.admin) {
    res.redirect('/pages/folders')
  } else {
    if (req.body?.viewitem) {
      res.redirect('/pages/items?viewitem=' + encodeURIComponent(req.body.viewitem))
    } else {
      res.redirect('/pages/items')
    }
  }
}

// Logout page
app.get('/logout', (req, res) => {
  req.session.destroy()
  if (req.query?.error) {
    res.redirect('/login?error=' + encodeURIComponent(req.query.error))
  } else {
    res.redirect('/login')
  }
})

// Items
app.get('/pages/items', async (req, res) => {
  req.locals = {
    pagetitle: 'Items',
    pageid: 'items'
  }
  res.render('items', { ...req.locals, ...commonParams(req) })
})

// Item types
app.get('/pages/itemtypes', async (req, res) => {
  req.locals = {
    pagetitle: 'Item types',
    pageid: 'itemtypes'
  }
  res.render('itemtypes', { ...req.locals, ...commonParams(req) })
})

// Groups
app.get('/pages/groups', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  const page = {
    pagetitle: 'Groups',
    pageid: 'groups'
  }
  res.render('groups', { ...page, ...commonParams(req) })
})

// Users page
app.get('/pages/users', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  const page = {
    pagetitle: 'Users',
    pageid: 'users'
  }
  res.render('users', { ...page, ...commonParams(req) })
})

// Folders
app.get('/pages/folders', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  req.locals = {
    pagetitle: 'Folders permissions',
    pageid: 'folders'
  }
  res.render('folders', { ...req.locals, ...commonParams(req) })
})

// Search items
app.get('/pages/search', async (req, res) => {
  req.locals = {
    pagetitle: 'Search items',
    pageid: 'search',
    search: req.query.search || ''
  }
  res.render('search', { ...req.locals, ...commonParams(req) })
})

// Generate password
app.get('/pages/generate', async (req, res) => {
  req.locals = {
    pagetitle: 'Password generator',
    pageid: 'generate',
    passwordlength: Config.get().generate_password_length || 15
  }
  res.render('generate', { ...req.locals, ...commonParams(req) })
})

// Info
app.get('/pages/info', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  const page = {
    pagetitle: 'Info',
    pageid: 'info'
  }

  const resp = await PassWeaver.info(req.session)

  page.guiVersion = Config.packageJson().version
  page.guiStartup = Config.get().startuptime
  page.apiVersion = resp.data.version
  page.apiStartup = resp.data.startup
  page.users = resp.data.users
  page.folders = resp.data.folders
  page.items = resp.data.items
  page.cacheProvider = resp.data.cacheProvider
  page.cacheSize = resp.data.cacheSize ?? 0
  page.undiciCacheSize = await PassWeaver.getUndiciCacheSize()

  res.render('info', { ...page, ...commonParams(req) })
})

// Settings
app.get('/pages/settings', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  req.locals = {
    pagetitle: 'Settings',
    pageid: 'settings'
  }
  res.render('settings', { ...req.locals, ...commonParams(req) })
})

// Preferences
app.get('/pages/preferences', async (req, res) => {
  const usr = await PassWeaver.getUser(req.session, req.session.user)
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.locals = {
    pagetitle: 'Preferences',
    pageid: 'preferences',
    authmethod: usr.data.authmethod,
    unlocked: jwt?.personaltoken
  }

  res.render('preferences', { ...req.locals, ...commonParams(req) })
})

// One time secret create
app.get('/pages/onetimesecret', async (req, res) => {
  const defaultHours = Config.get().onetimetokens.default_hours
  const days = Math.floor(defaultHours / 24)
  const hours = defaultHours % (days * 24)
  const expireHuman = `${days} days and ${hours} hours`

  req.locals = {
    pagetitle: 'One time secret',
    pageid: 'onetimesecret',
    expire_human: expireHuman,
    data: req?.query?.data || ''
  }

  res.render('onetimesecret', { ...req.locals, ...commonParams(req) })
})

// One time secret display
app.get('/onetimesecret/:token', async (req, res) => {
  req.locals = {
    pagetitle: 'One time secret',
    pageid: 'onetimesecretshow',
    token: encodeURIComponent(req.params.token)
  }
  res.render('onetimesecretshow', { ...req.locals, ...commonParams(req) })
})

// One time secret display (no auth)
app.get('/noauth/onetimesecret/:token', async (req, res) => {
  req.locals = {
    pagetitle: 'One time secret',
    pageid: 'onetimesecretshow',
    token: encodeURIComponent(req.params.token)
  }
  res.render('onetimesecretshow', { ...req.locals, ...commonParams(req) })
})

app.get('/pages/kms', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  const page = {
    pagetitle: 'KMS',
    pageid: 'kms'
  }
  res.render('kms', { ...page, ...commonParams(req) })
})

app.get('/pages/apikeys', async (req, res) => {
  if (!req.session.admin) {
    res.status(403).send()
    return
  }

  const page = {
    pagetitle: 'API keys',
    pageid: 'apikeys'
  }
  res.render('apikeys', { ...page, ...commonParams(req) })
})

/**
 * API
 */

// Items list
app.get('/api/itemslist/:folder', async (req, res) => {
  const list = await PassWeaver.itemsList(req.session, req.params.folder, req.query?.search, req.query?.type, req.query?.favorite)
  res.json(list)
})

// Items search
app.get('/api/itemssearch/', async (req, res) => {
  const list = await PassWeaver.itemsSearch(req.session, req.query?.search, req.query?.type, req.query?.limit, req.query?.favorite)
  res.json(list)
})

// Item link
app.get('/api/items/:item/link', async (req, res) => {
  const data = await PassWeaver.itemLink(req, req.session, req.params.item)
  res.json(data)
})

// Folder details
app.get('/api/folders/:folder', async (req, res) => {
  const info = await PassWeaver.getFolder(req.session, req.params.folder)
  res.json(info)
})

// Get item
app.get('/api/items/:item', async (req, res) => {
  const key = req.query?.key
  if (!key) {
    res.json({
      status: 'failed',
      httpStatusCode: '400',
      fatal: false,
      message: 'key parameter is required',
      data: {}
    })
    return
  }
  const resp = await PassWeaver.itemGet(req.session, req.params.item, req.body)

  if (resp.status === 'success') {
    // Encrypt data using given key (decode base64 key to bytes)
    resp.data.data = Crypt.encryptData(resp.data.data, Buffer.from(key, 'base64'))
  }

  res.json(resp)
})

// Create item
app.post('/api/itemnew/:folder', async (req, res) => {
  const resp = await PassWeaver.itemCreate(req.session, req.params.folder, req.body)
  res.json(resp)
})

// Delete item
app.post('/api/itemremove/:item', async (req, res) => {
  const resp = await PassWeaver.itemRemove(req.session, req.params.item, req.body)
  res.json(resp)
})

// Update item
app.post('/api/itemupdate/:item', async (req, res) => {
  const resp = await PassWeaver.itemUpdate(req.session, req.params.item, req.body)
  res.json(resp)
})

// Set favorite flag
app.post('/api/itemfavorite/:item', async (req, res) => {
  const resp = await PassWeaver.itemSetFavorite(req.session, req.params.item, req.body)
  res.json(resp)
})

// Move item
app.post('/api/itemmove/:item', async (req, res) => {
  const resp = await PassWeaver.itemMove(req.session, req.params.item, req.body)
  res.json(resp)
})

// Clone item
app.post('/api/items/:item/clone', async (req, res) => {
  const resp = await PassWeaver.itemClone(req.session, req.params.item)
  res.json(resp)
})

// Item activity
app.get('/api/items/:item/activity', async (req, res) => {
  const resp = await PassWeaver.itemActivity(req.session, req.params.item, req.query?.lastid)
  res.json(resp)
})

// Get folders tree for user
app.get('/api/users/:user/folders', async (req, res) => {
  const resp = await PassWeaver.userFoldersTree(req.session, req.params.user, req?.query?.permissions || false)
  res.json(resp)
})

// Create folder
app.post('/api/foldernew/:folder', async (req, res) => {
  const resp = await PassWeaver.folderCreate(req.session, req.params.folder, req.body)
  res.json(resp)
})

// Delete folder
app.post('/api/folderremove/:folder', async (req, res) => {
  const resp = await PassWeaver.folderRemove(req.session, req.params.folder, req.body)
  res.json(resp)
})

// Update folder
app.post('/api/folderupdate/:folder', async (req, res) => {
  const resp = await PassWeaver.folderUpdate(req.session, req.params.folder, req.body)
  res.json(resp)
})

// Get groups tree
app.get('/api/groupstree', async (req, res) => {
  const resp = await PassWeaver.groupsTree(req.session)
  res.json(resp)
})

// Group members list
app.get('/api/userslist/:group', async (req, res) => {
  const list = await PassWeaver.usersList(req.session, req.params.group)
  res.json(list)
})

// Create group
app.post('/api/groupnew/:group', async (req, res) => {
  const resp = await PassWeaver.groupCreate(req.session, req.params.group, req.body)
  res.json(resp)
})

// Group details
app.get('/api/groups/:group', async (req, res) => {
  const info = await PassWeaver.getGroup(req.session, req.params.group)
  res.json(info)
})

// Update group
app.post('/api/groupupdate/:group', async (req, res) => {
  const resp = await PassWeaver.groupUpdate(req.session, req.params.group, req.body)
  res.json(resp)
})

// Delete group
app.post('/api/groupremove/:group', async (req, res) => {
  const resp = await PassWeaver.groupRemove(req.session, req.params.group)
  res.json(resp)
})

// Add user to group
app.post('/api/groupadduser/:group/:user', async (req, res) => {
  const resp = await PassWeaver.groupAddUser(req.session, req.params.group, req.params.user)
  res.json(resp)
})

// Remove user from group
app.post('/api/groupremoveuser/:group/:user', async (req, res) => {
  const resp = await PassWeaver.groupRemoveUser(req.session, req.params.group, req.params.user)
  res.json(resp)
})

// Get folders tree for group
app.get('/api/groups/:group/folders', async (req, res) => {
  const resp = await PassWeaver.groupFoldersTree(req.session, req.params.group)
  res.json(resp)
})

// Get users list
app.get('/api/userslist', async (req, res) => {
  const list = await PassWeaver.usersList(req.session, null, req.query?.search)
  res.json(list)
})

// Create user
app.post('/api/usernew', async (req, res) => {
  const resp = await PassWeaver.userCreate(req.session, req.body)
  res.json(resp)
})

// Get user
app.get('/api/users/:item', async (req, res) => {
  const resp = await PassWeaver.userGet(req.session, req.params.item)
  res.json(resp)
})

// Update user
app.post('/api/userupdate/:item', async (req, res) => {
  const resp = await PassWeaver.userUpdate(req.session, req.params.item, req.body)
  res.json(resp)
})

// Delete user
app.post('/api/userremove/:user', async (req, res) => {
  const resp = await PassWeaver.userRemove(req.session, req.params.user)
  res.json(resp)
})

// Get user's groups
app.get('/api/usergroups/:id', async (req, res) => {
  const resp = await PassWeaver.userGroups(req.session, req.params.id)
  res.json(resp)
})

// User activity
app.get('/api/users/:user/activity', async (req, res) => {
  const resp = await PassWeaver.userActivity(req.session, req.params.user, req.query?.lastid)
  res.json(resp)
})

// Generate random password
app.get('/api/generatepassword', async (req, res) => {
  const resp = await PassWeaver.generatePassword(req.session, req.query?.symbols, req.query?.length)
  res.json(resp)
})

// Get folder's groups
app.get('/api/foldergroups/:id', async (req, res) => {
  const resp = await PassWeaver.folderGroups(req.session, req.params.id)
  res.json(resp)
})

// Get groups list
app.get('/api/groupslist', async (req, res) => {
  const list = await PassWeaver.groupsList(req.session, req.query?.search)
  res.json(list)
})

// Add group to folder
app.post('/api/folders/:folder/groups/:group', async (req, res) => {
  const resp = await PassWeaver.folderAddGroup(req.session, req.params.folder, req.params.group)
  res.json(resp)
})

// Remove group from folder
app.delete('/api/folders/:folder/groups/:group', async (req, res) => {
  const resp = await PassWeaver.folderRemoveGroup(req.session, req.params.folder, req.params.group)
  res.json(resp)
})

// Toggle group permissions on folder
app.post('/api/folders/:folder/groups/:group/toggle', async (req, res) => {
  const resp = await PassWeaver.folderToggleGroup(req.session, req.params.folder, req.params.group)
  res.json(resp)
})

// Create personal password
app.post('/api/personalpassword', async (req, res) => {
  const resp = await PassWeaver.personalPasswordCreate(req, req.session, req.body.password)
  res.json(resp)
})

// Reset personal password
app.post('/api/personalpasswordreset', async (req, res) => {
  const resp = await PassWeaver.personalPasswordReset(req, req.session, req.body.password)
  res.json(resp)
})

// Unlock personal folder
app.post('/api/personalunlock', async (req, res) => {
  const resp = await PassWeaver.personalUnlock(req, req.session, req.body.password)
  res.json(resp)
})

// Change personal folder password
app.post('/api/personalpasswordchange', async (req, res) => {
  const resp = await PassWeaver.personalPasswordChange(req.session, req.body.password)
  res.json(resp)
})

// Events
app.post('/api/events', async (req, res) => {
  const resp = await PassWeaver.addEvent(req.session, req.body.event, req.body.entity, req.body.entityid)
  res.json(resp)
})

// Get user preferences
app.get('/api/preferences', async (req, res) => {
  const resp = await PassWeaver.preferencesGet(req.session)
  res.json(resp)
})

// Set user preferences
app.post('/api/preferences', async (req, res) => {
  const resp = await PassWeaver.preferencesSet(req, req.session)

  // Reapply theme
  const theme = req?.body?.theme
  const font = req?.body?.font
  if (theme) {
    req.session.theme = theme
    req.session.save()
  }
  if (font) {
    req.session.font = font
    req.session.save()
  }
  res.json(resp)
})

// Change password
app.post('/api/changepassword', async (req, res) => {
  const resp = await PassWeaver.passwordChange(req.session, req.body.password)
  res.json(resp)
})

// Item types list
app.get('/api/itemtypes', async (req, res) => {
  const resp = await PassWeaver.itemTypesList(req.session, req.query?.search || '')
  res.json(resp)
})

// New item type
app.post('/api/itemtypes', async (req, res) => {
  const resp = await PassWeaver.itemTypeCreate(req.session, req.body.description, req.body.icon)
  res.json(resp)
})

// Delete item type
app.delete('/api/itemtypes/:id', async (req, res) => {
  const resp = await PassWeaver.itemTypeRemove(req.session, req.params.id)
  res.json(resp)
})

// Get item type
app.get('/api/itemtypes/:id', async (req, res) => {
  const resp = await PassWeaver.itemTypeGet(req.session, req.params.id)
  res.json(resp)
})

// Update item type
app.patch('/api/itemtypes/:id', async (req, res) => {
  const resp = await PassWeaver.itemTypeEdit(req.session, req.params.id, req.body.description, req.body.icon)
  res.json(resp)
})

// KMS list
app.get('/api/kms', async (req, res) => {
  const resp = await PassWeaver.kmsList(req.session, req.query?.search || '')
  res.json(resp)
})

// New KMS
app.post('/api/kms', async (req, res) => {
  const resp = await PassWeaver.kmsCreate(req.session, req.body.description, req.body.type, req.body.active, req.body.config)
  res.json(resp)
})

// Delete KMS
app.delete('/api/kms/:id', async (req, res) => {
  const resp = await PassWeaver.kmsRemove(req.session, req.params.id)
  res.json(resp)
})

// Get KMS
app.get('/api/kms/:id', async (req, res) => {
  const resp = await PassWeaver.kmsGet(req.session, req.params.id)
  res.json(resp)
})

// Update KMS
app.patch('/api/kms/:id', async (req, res) => {
  const resp = await PassWeaver.kmsEdit(req.session, req.params.id, req.body.description, req.body.type, req.body.active, req.body.config)
  res.json(resp)
})

// API keys list
app.get('/api/apikeys', async (req, res) => {
  const resp = await PassWeaver.apikeysList(req.session, req.query?.search || '', req.query?.userid || '')
  res.json(resp)
})

// New API key
app.post('/api/apikeys', async (req, res) => {
  const resp = await PassWeaver.apikeysCreate(req.session, req.body.description, req.body.userid, req.body.expiresat, req.body.active, req.body.ipwhitelist, req.body.timewhitelist)
  res.json(resp)
})

// Delete API key
app.delete('/api/apikeys/:id', async (req, res) => {
  const resp = await PassWeaver.apikeysRemove(req.session, req.params.id)
  res.json(resp)
})

// Get API key
app.get('/api/apikeys/:id', async (req, res) => {
  const resp = await PassWeaver.apikeysGet(req.session, req.params.id)
  res.json(resp)
})

// Update API key
app.patch('/api/apikeys/:id', async (req, res) => {
  const resp = await PassWeaver.apikeysEdit(req.session, req.params.id, req.body.description, req.body.userid, req.body.expiresat, req.body.active, req.body.ipwhitelist, req.body.timewhitelist)
  res.json(resp)
})

// Create one time secret
app.post('/api/onetimesecret', async (req, res) => {
  const resp = await PassWeaver.oneTimeSecretCreate(req, req.session, req.body.data, req.body.scope, req.body.userid)
  res.json(resp)
})

// Create one time item share
app.post('/api/onetimeshare', async (req, res) => {
  const resp = await PassWeaver.oneTimeShareCreate(req, req.session, req.body.itemid, req.body.scope, req.body.userid)
  res.json(resp)
})

// Clear the cache
app.post('/api/clearcache', async (req, res) => {
  const resp = await PassWeaver.clearCache(req.session)
  res.json(resp)
})

// Get readonly status
app.get('/api/readonlystatus', async (req, res) => {
  const resp = await PassWeaver.readOnlyStatus(req.session)
  res.json(resp)
})

// Get system lock status
app.get('/api/systemlockstatus', async (req, res) => {
  const resp = await PassWeaver.systemLockStatus(req.session)
  res.json(resp)
})

// Get one time secret content
app.get('/noauth/onetimesecretget/:token', async (req, res) => {
  const key = req.query?.key
  if (!key) {
    res.json({
      status: 'failed',
      httpStatusCode: '400',
      fatal: false,
      message: 'key parameter is required',
      data: {}
    })
    return
  }

  const resp = await PassWeaver.oneTimeSecretGet(req.session, req.params.token)

  // Encrypt data using given key (decode base64 key to bytes)
  if (resp.data?.secret?.length > 0 || resp.data?.item?.id?.length > 0) {
    resp.data = await Crypt.encryptData(JSON.stringify(resp.data), Buffer.from(key, 'base64'))
  }

  res.json(resp)
})

// System set readonly
app.post('/api/systemreadonly', async (req, res) => {
  const resp = await PassWeaver.systemReadOnly(req.session, req.body.readonly)
  res.json(resp)
})

// System set lock
app.post('/api/systemlock', async (req, res) => {
  const resp = await PassWeaver.systemLock(req.session, req.body.lock)
  res.json(resp)
})

// Create item link
app.post('/api/linkeditems', async (req, res) => {
  const resp = await PassWeaver.linkCreate(req, req.session, req.body.folderid, req.body.itemid)
  res.json(resp)
})

// Error handler
app.use((err, req, res, next) => {
  logErrors.write(`[${(new Date()).toString()}]\n`)
  logErrors.write(`${req.method} ${req.originalUrl}\n`)
  logErrors.write(`${err.stack}\n`)
  logErrors.write(`${err.message}\n`)
  res.redirect('/logout?error=' + encodeURIComponent(err))
})

// HTTP(S) server startup
if (cfg.https.enabled) {
  https.createServer({
    key: FS.readFileSync(cfg.https.private_key),
    cert: FS.readFileSync(cfg.https.certificate)
  },
  app
  ).listen(cfg.listen.port, cfg.listen.host)

  console.log(`Listening on '${cfg.listen.host}' port ${cfg.listen.port} (https)`)
} else {
  app.listen(cfg.listen.port, cfg.listen.host)
  console.log(`Listening on '${cfg.listen.host}' port ${cfg.listen.port} (http)`)
}
